# EmailJS setup

The store uses one EmailJS service with two templates: order confirmation and contact form. A failed confirmation email does not cancel a successful order.

## Create the service and templates

1. Create an account at [EmailJS](https://dashboard.emailjs.com) and add an email service.
2. Copy the Service ID and Public Key.
3. Create an order template from `emailjs/order-confirmation.html`. Set its recipient to `{{to_email}}` and reply-to to `{{store_email}}`.
4. Create a contact template from `emailjs/contact.html`. Set its recipient to `{{to_email}}` and reply-to to `{{from_email}}`.
5. In the admin, open **Store settings → EmailJS**, enter the Service ID, Public Key and both template IDs, then save.

The EmailJS public key is intended for browser use. Restrict allowed domains and enable rate limiting in EmailJS account security.

The order template receives `store_name`, `store_email`, `store_phone`, customer and delivery fields, order date and number, `orders` (an array of line items), and formatted subtotal, discount, shipping and total values. The contact template receives `from_name`, `from_email`, `phone`, `subject`, `message`, `store_name` and `to_email`.
