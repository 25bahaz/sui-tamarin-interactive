import { getQuizConfig } from "@/lib/sui";

export async function GET() {
  try {
    const cfg = getQuizConfig();
    return Response.json(cfg);
  } catch (e) {
    return Response.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
