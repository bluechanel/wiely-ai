// Resumable streams are disabled (no Redis support)
// This endpoint returns 204 No Content

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return new Response(null, { status: 204 });
}
