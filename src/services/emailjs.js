import emailjs from '@emailjs/browser';

async function config() {
  const response = await fetch('/api/integrations/emailjs');
  const values = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(values.error || 'Could not load email settings');
  return values;
}

const money = (n, currency) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} ${currency}`;

/**
 * Variable names below MUST match docs/EMAILJS.md and emailjs/order-confirmation.html.
 * `orders` is an array used with {{#orders}} ... {{/orders}} in the template.
 */
export async function sendOrderConfirmation({ order, customer, settings }) {
  const email = await config();
  if (!email.service_id || !email.template_id || !email.public_key) throw new Error('EmailJS is not configured');
  const currency = settings.currency || 'DA';
  const items = (order.items || []).map((i) => ({
    name: i.name,
    variant: [i.size, i.color_name].filter(Boolean).join(' / '),
    quantity: i.qty,
    unit_price: money(i.unit_price, currency),
    line_total: money(Number(i.unit_price) * Number(i.qty), currency),
    image_url: i.image_url || '',
  }));

  const params = {
    // recipient: the customer if they gave an email, otherwise the store owner
    to_email: customer.email || settings.email || '',
    store_email: settings.email || '',
    store_name: settings.store_name,
    store_phone: settings.phone || '',
    customer_name: customer.customer_name,
    customer_email: customer.email || '-',
    customer_phone: customer.phone,
    wilaya: customer.wilaya,
    municipality: customer.municipality,
    neighborhood: customer.neighborhood || '-',
    address: customer.address,
    delivery_note: customer.note || '-',
    order_id: String(order.order_number),
    order_date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(order.created_at)),
    orders: items,
    products_text: items.map((i) => `${i.quantity} x ${i.name}${i.variant ? ` (${i.variant})` : ''} - ${i.line_total}`).join('\n'),
    subtotal: money(order.subtotal, currency),
    discount: money(order.discount, currency),
    shipping: money(order.shipping, currency),
    total: money(order.total, currency),
    coupon_code: order.coupon_code || '-',
  };
  return emailjs.send(email.service_id, email.template_id, params, { publicKey: email.public_key });
}

/** Contact form. Template variables: from_name, from_email, phone, subject, message, store_name, to_email */
export async function sendContactMessage(form, settings) {
  const email = await config();
  if (!email.service_id || !email.contact_template_id || !email.public_key) throw new Error('The contact form is not configured yet');
  return emailjs.send(
    email.service_id,
    email.contact_template_id,
    {
      from_name: form.name,
      from_email: form.email,
      phone: form.phone || '-',
      subject: form.subject || 'New message',
      message: form.message,
      store_name: settings.store_name,
      to_email: settings.email || '',
    },
    { publicKey: email.public_key },
  );
}
