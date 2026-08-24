import { GET as getHandler, POST as postHandler } from "../private-sites/route";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export const GET = getHandler;
export const POST = postHandler;
