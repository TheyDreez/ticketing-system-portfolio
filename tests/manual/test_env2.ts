import dotenv from 'dotenv';
dotenv.config();

const t = process.env.AZURE_TENANT_ID || '';
const c = process.env.AZURE_CLIENT_ID || '';
const s = process.env.AZURE_CLIENT_SECRET || '';

console.log(`Tenant: ${t}`);
console.log(`Client: ${c}`);
console.log(`Secret: ${s}`);
