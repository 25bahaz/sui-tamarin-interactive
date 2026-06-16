import QRCode from "qrcode";

export async function QrCode({
  data,
  size = 320,
}: {
  data: string;
  size?: number;
}) {
  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    width: size,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  return (
    <div
      className="rounded-xl bg-white p-3 shadow-md"
      style={{ width: size + 24, height: size + 24 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
