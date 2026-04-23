import QRCode from "qrcode";

export async function GET() {
  const url = "https://la-mezkla-menu.vercel.app"; 

  const qr = await QRCode.toDataURL(url);

  return new Response(
    JSON.stringify({ qr }),
    { headers: { "Content-Type": "application/json" } }
  );
}
