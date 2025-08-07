-- 마이그레이션: lme-crawler-minutely를 8시간마다 실행되도록 변경
-- 작성일: 2025-01-08
-- 설명: 기존 15분마다 실행되던 크론을 8시간마다 실행되도록 변경 (0 */8 * * *)

-- 기존 크론 작업 제거
SELECT cron.unschedule('lme-crawler-minutely');

-- 새로운 스케줄로 크론 작업 재생성 (8시간마다 실행)
SELECT cron.schedule(
    'lme-crawler-minutely',
    '0 */8 * * *',
    'SELECT run_lme_crawler();'
);

-- 실행 기록을 위한 로그 추가
INSERT INTO cron_execution_logs (
    job_type,
    job_name,
    status,
    started_at,
    completed_at,
    metadata
) VALUES (
    'system',
    'cron-schedule-update',
    'success',
    NOW(),
    NOW(),
    jsonb_build_object(
        'operation', 'schedule_update',
        'job_name', 'lme-crawler-minutely',
        'old_schedule', '*/15 * * * *',
        'new_schedule', '0 */8 * * *',
        'description', '15분마다에서 8시간마다로 변경'
    )
);

-- 알림 메시지
DO $$
BEGIN
    RAISE NOTICE '⏰ lme-crawler-minutely 크론 작업 스케줄 변경 완료';
    RAISE NOTICE '   - 변경 전: */15 * * * * (15분마다)';
    RAISE NOTICE '   - 변경 후: 0 */8 * * * (8시간마다)';
    RAISE NOTICE '   - 다음 실행: 매일 0시, 8시, 16시';
END $$;
