-- 경매 종료 처리 크론 작업 스케줄을 5분 간격으로 변경
-- 2025-01-28: action_end_processor 실행 간격을 1분에서 5분으로 변경

DO $$
BEGIN
  -- 기존 auction-end-processor 작업 제거 (존재하는 경우에만)
  BEGIN
    PERFORM cron.unschedule('auction-end-processor');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- 새로운 스케줄로 auction-end-processor 등록 (5분마다)
  PERFORM cron.schedule(
    'auction-end-processor',
    '*/5 * * * *',  -- 1분 간격(* * * * *)에서 5분 간격(*/5 * * * *)으로 변경
    'SELECT process_ended_auctions();'
  );
  
  RAISE NOTICE '⏰ auction-end-processor 스케줄이 5분 간격으로 업데이트되었습니다.';
  RAISE NOTICE '   • 이전: 매분 실행 (* * * * *)';
  RAISE NOTICE '   • 변경: 5분마다 실행 (*/5 * * * *)';
END
$$;
