import { OWNER as O } from "./owner";

// Translation of the Spanish DRAFT (es.ts), pending legal review. If they differ, the Spanish text applies.

const avisoLegal = `## 1. Website owner

In accordance with article 10 of Spanish Law 34/2002 on information society services and electronic commerce (LSSI-CE), the owner of this website is:

- Owner: ${O.name}
- Tax ID (NIF): ${O.nif}
- Registered address: ${O.address}, Spain
- Email: ${O.email}
- Phone: [[contact phone number]]
- Registry details: Barcelona Commercial Registry, [[volume, folio, sheet and entry]]

This notice applies to the website ${O.web} and to the online shop ${O.shop} (together, “the website”).

## 2. Purpose

The website provides information about SphereWars: Otro Mundo, a miniatures game, its world, its downloadable rules, its events and its community, and lets you buy miniatures and game products.

## 3. Terms of use

Access to the website is free, apart from the cost of your connection. Users agree to use it lawfully, without harming the website or third parties, and without trying to access restricted areas such as the administration panel.

Purchases are governed by the [Terms of sale](/legal/condiciones) and the information on [Withdrawal and returns](/legal/devoluciones). The processing of personal data is explained in the [Privacy policy](/legal/privacidad) and the use of cookies in the [Cookie policy](/legal/cookies).

## 4. Intellectual and industrial property

The texts, rules, illustrations, photographs, videos, logos, faction and character names, and the design of the website belong to ${O.name} or to their authors and licensors, and are protected by intellectual and industrial property law. [[Confirm whether the SphereWars trademark is registered, with which office (OEPM or EUIPO) and in whose name]].

You may download and print the rules and cards offered free on the website for personal use and for playing. Any other use, in particular reproduction, distribution or transformation for commercial purposes, requires prior written permission.

## 5. Links

The website links to third-party services such as Instagram, YouTube and Discord. Following those links takes you off the website, and the terms and privacy policies of each service apply. ${O.name} does not control or answer for their content.

## 6. Liability

${O.name} tries to keep the information on the website accurate and up to date, but it may contain errors, which will be corrected as soon as they are detected. It is not liable for interruptions caused by third-party technical problems or force majeure. This limitation does not affect the rights the law gives consumers.

## 7. Applicable law

This notice is governed by Spanish law. If the user is a consumer, the courts that have jurisdiction under the law, including those of the consumer’s place of residence, are competent.
`;

const privacidad = `## 1. Data controller

- Controller: ${O.name}
- Tax ID (NIF): ${O.nif}
- Address: ${O.address}, Spain
- Email for privacy matters: ${O.email}
- Data protection officer: [[confirm whether one has been appointed; probably not required]]

This policy explains how personal data are processed on ${O.web} and in the shop ${O.shop}, under Regulation (EU) 2016/679 (GDPR) and Spanish Organic Law 3/2018 on data protection and digital rights (LOPDGDD).

## 2. What data we process, why, and on what legal basis

### Shop purchases

- Data: first and last name, email, billing and shipping address, phone (optional), products bought, amounts, order notes and, as WooCommerce does by default, the IP address and browser used to place the order. We do not receive card or Bizum details: the payment provider processes them.
- Purpose: to manage the order, payment, shipping, invoices, customer service, withdrawal, returns and guarantee. Order notifications go to the seller’s email.
- Legal basis: performance of the sales contract (article 6.1.b GDPR) and compliance with legal obligations such as tax and accounting (article 6.1.c GDPR). The order’s IP address and browser are processed on the basis of our legitimate interest in preventing fraud (article 6.1.f GDPR) [[confirm with the adviser or switch off their recording]].
- Retention: for the duration of the relationship and then blocked for the legal periods: six years for commercial records (article 30 of the Spanish Commercial Code), the tax limitation periods and three years of guarantee from delivery [[confirm periods]].

### Contact form

Only applies if the contact form is active on the website.

- Data: name, email, subject, message and language. Of the IP address, only an encrypted code (hash) is kept, used to limit bulk sending.
- Purpose: to answer your enquiry.
- Legal basis: the consent you give by ticking the box on the form (article 6.1.a GDPR). You can withdraw it at any time, without affecting earlier processing.
- Retention: as long as needed to reply and at most [[retention period for messages, for example one year]].

### Emails

If you write to ${O.email}, we use your data to reply, on the basis of your request and our legitimate interest in answering it (article 6.1.f GDPR), and keep them as long as needed to deal with it.

### Browsing and security

- Data: IP address, browser, pages requested, date and time, in the servers’ technical logs.
- Purpose: to serve the website, keep it secure and detect abuse.
- Legal basis: legitimate interest in the secure operation of the website (article 6.1.f GDPR).
- Retention: as set by each hosting provider for its logs [[confirm Vercel and cdmon periods]].

We do not send newsletters or marketing messages, do not use analytics or advertising cookies, do not build profiles and do not take automated decisions with legal effects.

## 3. Recipients and processors

We do not sell or share personal data. Only the providers we need to deliver the service see them, as processors or as independent controllers in their own field, plus the authorities when the law requires it:

- Vercel Inc. (United States): hosting of the website ${O.web}.
- 10dencehispahard SL (cdmon, Spain): hosting of the shop ${O.shop}, which runs on WordPress and WooCommerce and where orders are stored.
- Redsys Servicios de Procesamiento SL and [[name of the seller’s bank]]: card and Bizum payments. They act as independent controllers of payment data [[confirm role]].
- [[Name of the carrier]]: delivery of orders (shipping name, address and phone).
- Microsoft (Outlook/Hotmail email service): the seller’s email, which receives orders and messages [[confirm provider and terms]].
- Only if the contact form is active: Resend Inc. (United States), sending messages by email; Supabase Inc., the database where messages are stored [[server region]]; and Cloudflare Inc. (United States), if the Turnstile anti-spam check is active.
- [[Tax adviser or accountant, if any]].
- Tax authorities, courts and law enforcement, when the law requires it.

## 4. International transfers

Some providers (Vercel, Microsoft and, if used, Resend, Supabase and Cloudflare) are US companies or may process data there. These transfers rely on the adequacy decision for the EU-US Data Privacy Framework for certified companies or, failing that, on the European Commission’s standard contractual clauses [[verify each provider’s certification and safeguard]].

## 5. Your rights

You can exercise your rights of access, rectification, erasure, objection, restriction and portability, and withdraw your consent at any time, by writing to ${O.email} or by post to ${O.address}. State which right you are exercising. If we have reasonable doubts about your identity, we may ask for further information to confirm it. We will reply within one month, extendable in the cases provided for in the GDPR.

If you believe we have not handled your rights properly, you can complain to the Spanish Data Protection Agency (AEPD), C/ Jorge Juan 6, 28001 Madrid, https://www.aepd.es

## 6. Minors

The shop is aimed at adults. Children under 14 may not provide their data without the consent of their parents or guardians (article 7 LOPDGDD).

## 7. Security

We apply technical and organisational measures appropriate to the risk: encrypted connections (https), restricted access to management panels and providers that offer security guarantees.

## 8. Changes

If this policy changes, we will publish the new version on this page with its date.
`;

const cookies = `## 1. What they are

Cookies are small files a website stores in your browser. Local storage (localStorage) is a similar mechanism. This policy explains which ones ${O.web} and ${O.shop} use, under article 22.2 of the LSSI-CE.

## 2. Summary

We only use technical cookies and storage that are strictly necessary for the service you ask for: remembering your language, your cart and your order, and access for the people who manage the site. We do not use analytics, advertising or social media cookies. That is why we do not ask for consent, but we do inform you about them [[confirm with the adviser that all are exempt]].

Fonts and videos are served from our own domain and no third-party videos or content are embedded. The links to Instagram, YouTube and Discord are plain links: those services only set their cookies if you visit them.

## 3. Website (${O.web})

| Name | Type | Purpose | Duration | Necessary |
| sw_locale | First-party cookie | Remember the website language (es, en or ca) | 1 year | Yes |
| sw_cart_v1 | Local storage | Keep the products in the cart and their quantities, with no personal data | Until you empty the cart or clear your browser data | Yes |
| sw_cleared_orders_v1 | Local storage | Remember the last completed orders so the cart is not emptied twice | Until you clear your browser data | Yes |
| sb-…-auth-token | First-party cookie | Keep the administration panel session. Authorised staff only | Panel session | Yes |
| __prerender_bypass, __next_preview_data | First-party cookies | Draft preview. Authorised staff only | Session | Yes |

If the contact form uses the Cloudflare Turnstile anti-spam check, opening the contact page loads a Cloudflare Inc. service that protects the form against automated submissions [[verify what Turnstile stores in the browser]].

## 4. Shop (${O.shop})

The shop runs on WordPress and WooCommerce. Payment takes place there.

| Name | Type | Purpose | Duration | Necessary |
| wp_woocommerce_session_… | First-party cookie | Identify your cart and shopping session | 2 days | Yes |
| woocommerce_cart_hash | First-party cookie | Detect changes to the cart | Session | Yes |
| woocommerce_items_in_cart | First-party cookie | Know whether the cart has products | Session | Yes |
| wordpress_*, wordpress_logged_in_*, wp-settings-* | First-party cookies | Session of the staff who manage the shop | Session or up to 1 year | Yes |

WooCommerce order attribution cookies (sbjs_*) are switched off. [[Check on the live shop whether the theme or any plugin adds other cookies, local storage or third-party resources such as Google Fonts, and complete this table]].

When you pay, the Redsys payment page opens on its own domain and uses its own technical cookies, under its responsibility.

## 5. How to manage them

You can view and delete cookies and local storage in your browser settings. If you block them, the website will not remember your language or your cart, and you will not be able to complete a purchase.

## 6. Changes

If we ever add cookies that are not necessary, such as analytics, we will ask for your consent first and update this policy.
`;

const condiciones = `## 1. Seller and scope

These terms govern purchases in the SphereWars online shop. The seller is ${O.name}, tax ID (NIF) ${O.nif}, registered at ${O.address}, Spain, email ${O.email}. Phone: [[contact phone number]].

They apply to purchases by consumers, under Spanish Royal Legislative Decree 1/2007, the consolidated text of the General Law for the Protection of Consumers and Users (LGDCU). [[Decide whether businesses and shops can also buy, and on what terms]].

The version in force is the one published on the website when you place your order. You must accept it before paying.

## 2. Products

We sell 28 mm resin miniatures for the SphereWars game, supplied unassembled and unpainted, and other game products. Photographs may show assembled and painted miniatures as examples only. Assembly may require tools and glue, which are not included [[confirm]].

[[Safety warning and recommended age: for example “Not suitable for children under 14. Contains small parts”. Confirm with the adviser]].

## 3. Prices and taxes

Prices are in euros and include 21% Spanish VAT (IVA). Shipping costs are shown separately and added before you confirm the order.

For shipments outside the European Union, the shop shows the price without Spanish VAT at checkout. Customs duties, import taxes and customs handling in the destination country are paid by the buyer [[confirm]]. [[Tax treatment of shipments to the Canary Islands, Ceuta and Melilla: to be decided with the adviser]].

The total amount, including taxes and shipping, is always shown before you pay.

## 4. Shipping costs

| Destination | Shipping cost | Free shipping |
| Spain | €5 | Orders from €50 |
| European Union and rest of the world | €15 | Orders from €100 |

Shipping costs include VAT where applicable. We ship to all countries.

## 5. How to order

- Choose the products and add them to the cart on ${O.web}.
- Press pay to go to the shop’s checkout at ${O.shop}, where you enter your name, email and addresses. Phone is optional.
- Before paying you see the summary with products, taxes, shipping and total, and you can go back to correct any detail.
- You accept these terms and pay. The order involves an obligation to pay.
- You receive the order confirmation by email.

The contract is concluded in Spanish [[confirm whether other languages are offered]]. The order is stored in the shop and you can ask us for a copy at any time.

## 6. Payment

You can pay by card or Bizum through our bank’s secure Redsys payment gateway. The charge is made when the order is confirmed. We never see or store your card details.

## 7. Delivery

- Carrier: [[name of the carrier]].
- Preparation and delivery time: [[times by destination]]. Unless another time is stated, we will deliver within 30 calendar days of purchase at the latest (article 66 bis LGDCU).
- If a product is unavailable after payment, we will tell you and refund what you paid for it without undue delay.
- Risk of loss or damage passes to you when you receive the order.

If the parcel arrives damaged, see the procedure in [Withdrawal and returns](/legal/devoluciones).

## 8. Right of withdrawal

You have 14 calendar days to withdraw from the purchase without giving reasons. The conditions, procedure and form are in [Withdrawal and returns](/legal/devoluciones).

## 9. Guarantee

We are liable for any lack of conformity of the products that exists at delivery and becomes apparent within three years of it (articles 114 ff. LGDCU). You can choose repair or replacement, unless impossible or disproportionate, and where applicable ask for a price reduction or termination of the contract. These remedies are free of charge for you, including shipping.

Damage caused when assembling, cutting, sanding, gluing or painting the parts, or by misuse, is not a lack of conformity.

## 10. Customer service and complaints

Write to ${O.email} with any question, incident or complaint. We will reply as soon as possible [[response time]]. [[Official complaint forms and requirements of Catalan consumer law: confirm with the adviser]].

## 11. Dispute resolution

If we cannot reach an agreement, you can turn to public consumer services, such as the Catalan Consumer Agency (Agència Catalana del Consum) or your local consumer information office, and to the consumer arbitration boards. [[State whether ${O.name} is a member of the Consumer Arbitration System or another alternative dispute resolution body]].

The European online dispute resolution (ODR) platform closed on 20 July 2025, so it is not linked.

## 12. Applicable law

These terms are governed by Spanish law, without prejudice to the rights granted by the law of your country of residence if you are a consumer in another State. Disputes fall to the courts that have jurisdiction under the law, including those of your place of residence.
`;

const devoluciones = `## 1. Right of withdrawal

You may withdraw from your purchase within 14 calendar days without giving any reason (articles 102 ff. LGDCU). The period starts on the day you, or a person you name other than the carrier, receive the products. If an order arrives in several deliveries, it runs from the last one.

## 2. How to withdraw

Before the period ends, tell us your decision clearly:

- by email to ${O.email}, or
- by post to ${O.name}, ${O.address}.

You can use the [withdrawal form](#formulario-de-desistimiento) on this page, but you do not have to. We will confirm receipt by email. [[Online withdrawal function required by Directive (EU) 2023/2673: confirm with the adviser its transposition in Spain and how to implement it]].

## 3. Returning the products

Send the products to [[return address, if not the registered address]] without undue delay and at the latest within 14 calendar days of telling us you are withdrawing.

Cost of return shipping: [[decide who pays it: the buyer or the seller]].

You may check the products as you would in a shop. If you handle them beyond that, for example by removing parts from their sprues, cutting, sanding, gluing or painting them, you will be liable for any loss in value (article 108 LGDCU).

## 4. Refund

We will refund everything you paid, including the original shipping costs (except any extra cost if you chose a delivery other than the cheapest we offer), without undue delay and at the latest within 14 calendar days of being told of your withdrawal. We may wait until we receive the products, or until you prove you have sent them, before refunding.

We will use the same payment method you used, unless we agree otherwise. You will not pay any fee for the refund.

## 5. Damaged, wrong or incomplete products

- If the parcel is visibly damaged, tell the carrier on delivery if possible.
- Email ${O.email} as soon as possible with the order number and photos of the parcel and the products.
- We will tell you how to return them, if needed, and send a replacement or refund your money, as you choose, under the legal guarantee.
- In these cases, we pay the shipping.

Telling us early helps us claim from the carrier, but it does not reduce your rights: the legal guarantee of conformity lasts three years from delivery. See the [Terms of sale](/legal/condiciones).

## Withdrawal form {#formulario-de-desistimiento}

Model form (annex B of the LGDCU). Complete and return it only if you wish to withdraw from the contract.

- To: ${O.name}, ${O.address}, ${O.email}
- I hereby give notice that I withdraw from my contract of sale of the following goods: [list the products]
- Ordered on: [date] / received on: [date]
- Order number: [number]
- Name of consumer: [name]
- Address of consumer: [address]
- Signature of consumer (only if this form is notified on paper)
- Date: [date]
`;

export const en = { "aviso-legal": avisoLegal, privacidad, cookies, condiciones, devoluciones };
