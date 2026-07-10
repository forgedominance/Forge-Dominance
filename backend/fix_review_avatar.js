const { supabase } = require('./config/supabase');

(async () => {
  const { data: row, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'global')
    .limit(1)
    .single();

  if (error) { console.error('Fetch error:', error); process.exit(1); }

  const reviews = row?.value?.reviewSection?.reviews || [];
  let changed = false;

  reviews.forEach((r) => {
    if (r.avatar && /unsplash\.com/i.test(r.avatar)) {
      console.log('Fixing review:', r.name, '->', r.avatar);
      r.avatar = '/assets/uploads/reviews/avatar-default.png'; // swap to a real local file you have
      changed = true;
    }
  });

  if (!changed) {
    console.log('No Unsplash avatars found — nothing to fix.');
    process.exit(0);
  }

  const newValue = { ...row.value, reviewSection: { ...row.value.reviewSection, reviews } };

  const { error: updateError } = await supabase
    .from('admin_settings')
    .update({ value: newValue })
    .eq('key', 'global');

  if (updateError) { console.error('Update error:', updateError); process.exit(1); }
  console.log('Fixed and saved.');
})();
