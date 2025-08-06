create extension if not exists "pg_net" with schema "public" version '0.14.0';

drop trigger if exists "trigger_update_user_push_tokens_updated_at" on "public"."user_push_tokens";

alter table "public"."user_push_tokens" drop constraint "user_push_tokens_device_type_check";

alter table "public"."user_push_tokens" drop constraint "user_push_tokens_user_id_token_key";

alter table "public"."notification_history" drop constraint "notification_history_user_id_fkey";

alter table "public"."user_push_tokens" drop constraint "user_push_tokens_user_id_fkey";

drop function if exists "public"."get_active_push_tokens"(user_ids uuid[]);

drop function if exists "public"."get_unread_notification_count"(p_user_id uuid);

drop function if exists "public"."log_notification_sent"(p_user_id uuid, p_title text, p_body text, p_data jsonb, p_notification_type text);

drop function if exists "public"."mark_notification_as_read"(notification_id uuid);

drop function if exists "public"."update_user_push_tokens_updated_at"();

drop index if exists "public"."idx_notification_history_is_read";

drop index if exists "public"."idx_notification_history_sent_at";

drop index if exists "public"."user_push_tokens_user_id_token_key";

alter table "public"."notification_history" drop column "is_read";

alter table "public"."notification_history" drop column "notification_type";

alter table "public"."notification_history" drop column "sent_at";

alter table "public"."notification_history" add column "read_at" timestamp without time zone;

alter table "public"."notification_history" add column "type" text not null;

alter table "public"."notification_history" alter column "created_at" set data type timestamp without time zone using "created_at"::timestamp without time zone;

alter table "public"."notification_history" alter column "user_id" set not null;

alter table "public"."user_push_tokens" drop column "device_type";

alter table "public"."user_push_tokens" drop column "token";

alter table "public"."user_push_tokens" add column "device_id" text;

alter table "public"."user_push_tokens" add column "expo_push_token" text not null;

alter table "public"."user_push_tokens" add column "platform" text not null;

alter table "public"."user_push_tokens" alter column "created_at" set data type timestamp without time zone using "created_at"::timestamp without time zone;

alter table "public"."user_push_tokens" alter column "updated_at" set data type timestamp without time zone using "updated_at"::timestamp without time zone;

alter table "public"."user_push_tokens" alter column "user_id" set not null;

CREATE INDEX idx_notification_history_created_at ON public.notification_history USING btree (created_at DESC);

CREATE UNIQUE INDEX user_push_tokens_user_id_expo_push_token_key ON public.user_push_tokens USING btree (user_id, expo_push_token);

alter table "public"."user_push_tokens" add constraint "user_push_tokens_platform_check" CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text]))) not valid;

alter table "public"."user_push_tokens" validate constraint "user_push_tokens_platform_check";

alter table "public"."user_push_tokens" add constraint "user_push_tokens_user_id_expo_push_token_key" UNIQUE using index "user_push_tokens_user_id_expo_push_token_key";

alter table "public"."notification_history" add constraint "notification_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."notification_history" validate constraint "notification_history_user_id_fkey";

alter table "public"."user_push_tokens" add constraint "user_push_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."user_push_tokens" validate constraint "user_push_tokens_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.process_ended_auctions()
 RETURNS TABLE(processed_count integer, successful_count integer, failed_count integer, error_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  ended_auction RECORD;
  total_processed INTEGER := 0;
  total_successful INTEGER := 0;
  total_failed INTEGER := 0;
  total_errors INTEGER := 0;
  auction_error TEXT;
  log_id UUID;
  
  -- 알림 관련 변수
  seller_tokens TEXT[];
  winner_tokens TEXT[];
  auction_title TEXT;
BEGIN
  -- 로그 시작 - UUID 생성
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'running', 
          jsonb_build_object('started_at', NOW()))
  RETURNING id INTO log_id;

  -- 타임아웃 설정 (5분)
  SET statement_timeout = '5min';
  
  -- 종료된 경매들 처리 (락 적용)
  FOR ended_auction IN 
    SELECT 
      a.id,
      a.title,
      a.starting_price,
      a.user_id as seller_id,
      a.end_time,
      a.status
    FROM auctions a
    WHERE a.end_time <= NOW() 
      AND a.status IN ('active', 'ending')
    ORDER BY a.end_time ASC
    FOR UPDATE OF a SKIP LOCKED -- 동시성 제어 개선
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      auction_title := ended_auction.title;
      
      -- 실제 최고 입찰자 재확인 (is_top_bid 신뢰하지 않음)
      DECLARE
        actual_winning_bid RECORD;
      BEGIN
        SELECT 
          ab.id as winning_bid_id,
          ab.user_id as winning_user_id,
          ab.amount as winning_amount,
          ab.user_name as winning_user_name
        INTO actual_winning_bid
        FROM auction_bids ab
        WHERE ab.auction_id = ended_auction.id
        ORDER BY ab.amount DESC, ab.bid_time ASC
        LIMIT 1;
        
        -- 알림을 위한 토큰 조회
        -- 경매 등록자 토큰
        SELECT array_agg(expo_push_token) INTO seller_tokens
        FROM user_push_tokens 
        WHERE user_id = ended_auction.seller_id AND is_active = true;
        
        -- 낙찰자 토큰 (낙찰된 경우)
        IF actual_winning_bid.winning_user_id IS NOT NULL THEN
          SELECT array_agg(expo_push_token) INTO winner_tokens
          FROM user_push_tokens 
          WHERE user_id = actual_winning_bid.winning_user_id AND is_active = true;
        END IF;
        
        -- 낙찰/유찰 결정 (실제 최고 입찰 기준)
        IF actual_winning_bid.winning_amount IS NOT NULL 
           AND actual_winning_bid.winning_amount >= ended_auction.starting_price THEN
        
        -- 낙찰 처리 (개선된 로직 - 실제 최고 입찰 기준)
        INSERT INTO auction_results (
          auction_id, 
          result_type, 
          winning_bid_id, 
          winning_user_id, 
          winning_amount,
          metadata
        ) VALUES (
          ended_auction.id, 
          'successful', 
          actual_winning_bid.winning_bid_id, 
          actual_winning_bid.winning_user_id, 
          actual_winning_bid.winning_amount,
          jsonb_build_object(
            'winning_user_name', actual_winning_bid.winning_user_name,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v3.0'
          )
        );
        
        -- 알림 발송 (예외 처리 개선)
        BEGIN
          -- 경매 등록자에게 알림
          IF array_length(seller_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              seller_tokens,
              '경매가 종료되었습니다',
              auction_title || ' 경매가 종료되었습니다.',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'seller',
                'result', 'successful'
              )
            );
            
            -- 히스토리 저장
            INSERT INTO notification_history (user_id, type, title, body, data)
            VALUES (ended_auction.seller_id, 'auction_ended', '경매가 종료되었습니다', 
                    auction_title || ' 경매가 종료되었습니다.',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
          
          -- 낙찰자에게 알림
          IF array_length(winner_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              winner_tokens,
              '경매에 낙찰되었습니다!',
              auction_title || ' 경매에 낙찰되었습니다!',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'winner',
                'result', 'successful',
                'winning_amount', actual_winning_bid.winning_amount
              )
            );
            
            -- 히스토리 저장
            INSERT INTO notification_history (user_id, type, title, body, data)
            VALUES (actual_winning_bid.winning_user_id, 'auction_won', '경매에 낙찰되었습니다!', 
                    auction_title || ' 경매에 낙찰되었습니다!',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 알림 발송 실패: % - %', auction_title, SQLERRM;
          -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
        END;
        
        total_successful := total_successful + 1;
        
        RAISE NOTICE '✅ 낙찰 처리: % (₩%) - 알림 발송 완료', ended_auction.title, actual_winning_bid.winning_amount;
        
      ELSE
        -- 유찰 처리 (개선된 로직 - 실제 최고 입찰 기준)
        INSERT INTO auction_results (
          auction_id, 
          result_type,
          metadata
        ) VALUES (
          ended_auction.id, 
          'failed',
          jsonb_build_object(
            'reason', CASE 
              WHEN actual_winning_bid.winning_amount IS NULL THEN 'no_bids'
              WHEN actual_winning_bid.winning_amount < ended_auction.starting_price THEN 'below_starting_price'
              ELSE 'unknown'
            END,
            'highest_bid', actual_winning_bid.winning_amount,
            'starting_price', ended_auction.starting_price,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v3.0'
          )
        );
        
        -- 경매 등록자에게 유찰 알림 (예외 처리 개선)
        BEGIN
          IF array_length(seller_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              seller_tokens,
              '경매가 유찰되었습니다',
              auction_title || ' 경매가 유찰되었습니다.',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'seller',
                'result', 'failed',
                'highest_bid', actual_winning_bid.winning_amount
              )
            );
            
            -- 히스토리 저장
            INSERT INTO notification_history (user_id, type, title, body, data)
            VALUES (ended_auction.seller_id, 'auction_failed', '경매가 유찰되었습니다', 
                    auction_title || ' 경매가 유찰되었습니다.',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 유찰 알림 발송 실패: % - %', auction_title, SQLERRM;
        END;
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고가: ₩%, 시작가: ₩%) - 알림 발송 완료', 
          ended_auction.title, 
          COALESCE(actual_winning_bid.winning_amount, 0), 
          ended_auction.starting_price;
        END IF;
      END; -- actual_winning_bid 블록 종료
      
      -- 경매 상태를 ended로 업데이트
      UPDATE auctions 
      SET status = 'ended', updated_at = NOW()
      WHERE id = ended_auction.id;
      
    EXCEPTION WHEN OTHERS THEN
      total_errors := total_errors + 1;
      auction_error := SQLERRM;
      
      RAISE NOTICE '❌ 경매 처리 오류: % - %', ended_auction.title, auction_error;
      
      -- 오류 로그 저장 - 올바른 작업 이름 사용
      INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
      VALUES ('auction', 'auction-end-processor', 'failed', 
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'error', auction_error,
                'timestamp', NOW()
              ));
    END;
  END LOOP;

  -- 로그 완료 - 기존 로그 업데이트
  UPDATE cron_execution_logs 
  SET status = 'success', 
      completed_at = NOW(),
      metadata = jsonb_build_object(
        'processed', total_processed,
        'successful', total_successful,
        'failed', total_failed,
        'errors', total_errors,
        'completed_at', NOW(),
        'version', 'v3.0'
      )
  WHERE id = log_id;

  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
EXCEPTION WHEN OTHERS THEN
  -- 전체 함수 실패 시 로그 업데이트
  IF log_id IS NOT NULL THEN
    UPDATE cron_execution_logs 
    SET status = 'failed', 
        completed_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'error', SQLERRM,
          'failed_at', NOW(),
          'version', 'v3.0'
        )
    WHERE id = log_id;
  END IF;
  
  RAISE;
END;
$function$
;


