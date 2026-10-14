import type { ShippingAddress,ShippingUpdate } from "./shipping-rules";
export type Shipment={address:ShippingAddress;status:string;carrier:string|null;trackingNumber:string|null;updates:ShippingUpdate[];updatedAt:string};
export const shippingLabel=(status:string)=>({address_received:"ADDRESS RECEIVED",preparing:"PREPARING TO SHIP",shipped:"SHIPPED",delivered:"DELIVERED",issue:"SHIPPING UPDATE"}[status]||status);
