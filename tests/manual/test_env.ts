import dotenv from 'dotenv';
dotenv.config();

const t = process.env.AZURE_TENANT_ID || '';
const c = process.env.AZURE_CLIENT_ID || '';
const s = process.env.AZURE_CLIENT_SECRET || '';

console.log(`Tenant length: ${t.length}, starts with: ${t.substring(0,4)}`);
console.log(`Client length: ${c.length}, starts with: ${c.substring(0,4)}`);
console.log(`Secret length: ${s.length}, starts with: ${s.substring(0,4)}, includes ~: ${s.includes('~')}`);
