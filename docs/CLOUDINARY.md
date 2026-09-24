# Cloudinary image uploads

The admin uploads images directly from the browser to Cloudinary. Before each upload, the browser requests a short-lived signature from the protected store API. The API secret stays on the server; only image URLs are saved in SQLite.

1. Create a Cloudinary account and find the Cloud name, API key and API secret in the Cloudinary dashboard.
2. Sign in to the store admin and open **Store settings → Cloudinary**.
3. Enter all three values and save the settings.
4. Upload an image from Products, Categories, Sliders or Store settings.

The app compresses images in the browser before uploading. It accepts images up to 10 MB. Deleting an image from the catalog does not delete it from the Cloudinary account.
