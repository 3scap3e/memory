export type ShippingAddress = { name: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; phone: string; email: string };
export const SHIPPING_STATUSES = ["address_received", "preparing", "shipped", "delivered", "issue"] as const;
export type ShippingStatus = typeof SHIPPING_STATUSES[number];
export type ShippingUpdate = { date: string; status: ShippingStatus; note: string };
export function shippingAddress(raw: unknown): ShippingAddress {
 if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Enter your delivery details.");
 const input = raw as Record<string,unknown>;
 const result = {} as ShippingAddress;
 for (const key of ["name","line1","line2","city","region","postalCode","country","phone","email"] as const) {
  const value = input[key] ?? "";
  if (typeof value !== "string" || value.trim().length > 200) throw new Error("Check your address details.");
  result[key] = value.trim();
 }
 if (!result.name || !result.line1 || !result.city || !result.country) throw new Error("Name, street, city and country are required.");
 result.country = result.country.toUpperCase();
 if (!/^[A-Z]{2}$/.test(result.country)) throw new Error("Use a two-letter country code, such as US or GB.");
 if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error("Check your contact email.");
 return result;
}
export function shippingUpdate(raw: Record<string,unknown>) {
 const status = raw.status;
 if (!SHIPPING_STATUSES.includes(status as ShippingStatus)) throw new Error("Choose a shipping status.");
 const read = (key: string, max: number) => { const value=raw[key] ?? ""; if(typeof value!=="string" || value.trim().length>max)throw new Error("Check the shipping update.");return value.trim(); };
 const carrier=read("carrier",100), trackingNumber=read("trackingNumber",200), note=read("note",1000);
 if(status==="shipped" && (!carrier || !trackingNumber))throw new Error("Carrier and tracking number are required when shipped.");
 return { status: status as ShippingStatus, carrier, trackingNumber, note };
}
