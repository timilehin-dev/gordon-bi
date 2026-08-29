import { createHmac } from 'node:crypto';
import { MarketplacePluginEntry } from './types.js';

export const GORDON_MARKETPLACE_PUBKEY = 'gordon_trusted_root_ca_2026_pubkey';

export function signPluginPayload(plugin: Omit<MarketplacePluginEntry, 'digitalSignature'>): string {
  const payload = `${plugin.id}:${plugin.name}:${plugin.version}:${plugin.author}:${plugin.targetTable}`;
  return createHmac('sha256', GORDON_MARKETPLACE_PUBKEY).update(payload).digest('hex');
}

const RAW_CATALOG: Omit<MarketplacePluginEntry, 'digitalSignature'>[] = [
  {
    id: 'plugin-stripe-billing',
    name: 'Stripe Revenue & Subscriptions',
    version: '1.2.0',
    category: 'billing',
    description: 'Ingests real-time MRR, invoices, churn, refund rates, and subscription events directly into DuckDB tables.',
    author: 'Gordon Core Team',
    isOfficial: true,
    signatureVerified: true,
    requiredScopes: ['db:write:stripe_charges', 'net:api.stripe.com'],
    targetTable: 'stripe_charges',
    icon: '💳',
  },
  {
    id: 'plugin-shopify-orders',
    name: 'Shopify E-Commerce Analytics',
    version: '1.1.0',
    category: 'ecommerce',
    description: 'Syncs products, order conversions, customer lifetime value, and inventory levels.',
    author: 'Gordon Core Team',
    isOfficial: true,
    signatureVerified: true,
    requiredScopes: ['db:write:shopify_orders', 'net:api.shopify.com'],
    targetTable: 'shopify_orders',
    icon: '🛍️',
  },
  {
    id: 'plugin-salesforce-crm',
    name: 'Salesforce Opportunity Pipeline',
    version: '2.0.1',
    category: 'crm',
    description: 'Extracts leads, pipeline stages, win/loss conversion rates, and quota attainment.',
    author: 'Gordon Core Team',
    isOfficial: true,
    signatureVerified: true,
    requiredScopes: ['db:write:salesforce_opportunities', 'net:login.salesforce.com'],
    targetTable: 'salesforce_opportunities',
    icon: '☁️',
  },
  {
    id: 'plugin-hubspot-marketing',
    name: 'HubSpot Inbound & Campaigns',
    version: '1.0.4',
    category: 'crm',
    description: 'Tracks ad spend ROI, attribution funnels, website leads, and campaign engagement.',
    author: 'Community Verified',
    isOfficial: false,
    signatureVerified: true,
    requiredScopes: ['db:write:hubspot_contacts', 'net:api.hubspot.com'],
    targetTable: 'hubspot_contacts',
    icon: '🎯',
  },
  {
    id: 'plugin-google-analytics-4',
    name: 'Google Analytics 4 (GA4)',
    version: '1.3.0',
    category: 'analytics',
    description: 'Fetches user sessions, bounce rates, event funnels, and landing page conversions.',
    author: 'Gordon Core Team',
    isOfficial: true,
    signatureVerified: true,
    requiredScopes: ['db:write:ga4_events', 'net:analyticsdata.googleapis.com'],
    targetTable: 'ga4_events',
    icon: '📈',
  },
  {
    id: 'plugin-jira-engineering',
    name: 'JIRA Velocity & Issue Tracker',
    version: '1.0.2',
    category: 'project_management',
    description: 'Analyzes sprint velocity, bug cycle times, epic completion dates, and team capacity.',
    author: 'Community Verified',
    isOfficial: false,
    signatureVerified: true,
    requiredScopes: ['db:write:jira_issues', 'net:atlassian.net'],
    targetTable: 'jira_issues',
    icon: '📋',
  },
];

export const CURATED_MARKETPLACE_CATALOG: MarketplacePluginEntry[] = RAW_CATALOG.map(item => ({
  ...item,
  digitalSignature: signPluginPayload(item),
}));
