CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  site_name text NOT NULL DEFAULT 'Bladesmith',
  contact_email text NOT NULL DEFAULT 'orders@bladesmith.com',
  whatsapp_number text NOT NULL DEFAULT '923298399619',
  whatsapp_message text NOT NULL DEFAULT 'Hi Bladesmith, I''m interested in a knife.',
  support_name text NOT NULL DEFAULT 'James',
  support_label text NOT NULL DEFAULT 'Bladesmith',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (
  id,
  site_name,
  contact_email,
  whatsapp_number,
  whatsapp_message,
  support_name,
  support_label,
  updated_at
)
VALUES (
  1,
  'Bladesmith',
  'orders@bladesmith.com',
  '923298399619',
  'Hi Bladesmith, I''m interested in a knife.',
  'James',
  'Bladesmith',
  now()
)
ON CONFLICT (id) DO NOTHING;
