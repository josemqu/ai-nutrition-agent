import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GLUCOAPP_API_KEY;
  const url = "https://glucodata-web.vercel.app/api/latest";

  try {
    if (!apiKey) {
      return NextResponse.json({ error: "GLUCOAPP_API_KEY no configurada" }, { status: 500 });
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30s as it is real-time
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error al obtener datos de GlucoData" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("GlucoData API response:", JSON.stringify(data));
    
    // Support for nested 'data' field or array structure
    const root = Array.isArray(data) ? data[0] : data;
    const body = root?.data || root; // If root has a 'data' property, its likely our payload
    
    const result = {
      sgv: body?.value || body?.sgv || body?.glucose || null,
      direction: body?.trend || body?.direction || null,
      date: body?.timestamp || body?.date || body?.time || null,
      full_data: data
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Glucose fetch error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
