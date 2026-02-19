import { auth } from '/auth';

const BASE_URL = process.env.BACKEND_API_URL;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!BASE_URL) {
    return Response.json(
      { message: 'BACKEND_API_URL이 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const session = await auth();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const upstream = await fetch(`${BASE_URL}/notifications/subscribe`, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (upstream.status === 401 || upstream.status === 403) {
    // 권한이 없는 경우 브라우저 콘솔 오류/재연결 폭주를 피하기 위해
    // 정상 SSE 포맷으로 auth-error 이벤트를 한 번 내보내고 종료한다.
    return new Response(
      `event: auth-error\ndata: {"status":${upstream.status}}\n\n`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { message: '알림 스트림 연결에 실패했습니다.' },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
