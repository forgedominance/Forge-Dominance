const supabase = require('../config/supabase');
const imageCache = require('../lib/imageCache');
const { isMissingTableError } = require('../lib/dbUtils');

const LIST_PRODUCT_COLUMNS = 'id, name, sku, price, compare_price, stock, category, description, featured, craft_story, blade, overall, handle, weight, grind, tang, sort_order';
const LIST_PRODUCT_COLUMNS_FALLBACK = 'id, name, sku, price, compare_price, stock, category, description, featured, craft_story, blade, overall, handle, weight, grind, tang';

function isTrueFlag(value) {
  return value === true || value === 'true';
}

function normalizePublicImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('//')) return raw;

  const normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('/assets/products/')) return normalized;
  if (normalized.startsWith('assets/products/')) return `/${normalized}`;

  const assetsIndex = normalized.lastIndexOf('/assets/');
  if (assetsIndex >= 0) {
    const tail = normalized.slice(assetsIndex);
    if (tail.startsWith('/assets/products/')) return tail;
    if (tail.startsWith('/assets/Products/')) return tail.replace('/assets/Products/', '/assets/products/');
    if (tail.startsWith('/assets/uploads/')) return tail.replace('/assets/uploads/', '/assets/products/');
  }

  if (normalized.includes('/')) {
    return `/assets/products/${normalized.split('/').pop()}`;
  }

  return `/assets/products/${normalized}`;
}

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

class Product {
  static sortImages(images) {
    return (Array.isArray(images) ? images : [])
      .slice()
      .sort((left, right) => {
        const leftThumb = isTrueFlag(left?.is_thumbnail) || isTrueFlag(left?.isThumbnail) || isTrueFlag(left?.is_primary) || isTrueFlag(left?.isPrimary);
        const rightThumb = isTrueFlag(right?.is_thumbnail) || isTrueFlag(right?.isThumbnail) || isTrueFlag(right?.is_primary) || isTrueFlag(right?.isPrimary);
        if (leftThumb !== rightThumb) return leftThumb ? -1 : 1;
        return Number(left?.sort_order || 0) - Number(right?.sort_order || 0);
      });
  }

  static normalizeImageRow(image, index = 0) {
    if (typeof image === 'string') {
      return {
        image_url: normalizePublicImageUrl(image),
        sort_order: index,
        is_thumbnail: index === 0,
        alt_text: null
      };
    }

    if (!image || typeof image !== 'object') return null;

    const imageUrl = normalizePublicImageUrl(image.image_url || image.url || image.path || image.src || '');
    if (!imageUrl) return null;

    return {
      image_url: imageUrl,
      sort_order: Number.isFinite(Number(image.sort_order)) ? Number(image.sort_order) : index,
      is_thumbnail: isTrueFlag(image.is_thumbnail) || isTrueFlag(image.isThumbnail) || isTrueFlag(image.is_primary) || isTrueFlag(image.isPrimary),
      alt_text: image.alt_text || null
    };
  }

  static normalizeImages(images) {
    if (!Array.isArray(images)) return [];
    const normalized = images
      .map((image, index) => Product.normalizeImageRow(image, index))
      .filter(Boolean)
      .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));

    if (!normalized.length) return [];

    const explicitThumbnailIndex = normalized.findIndex((image) => image.is_thumbnail === true);
    const thumbnailIndex = explicitThumbnailIndex >= 0 ? explicitThumbnailIndex : 0;

    return normalized.map((image, index) => ({
      ...image,
      sort_order: index,
      is_thumbnail: index === thumbnailIndex
    }));
  }

  static async syncImages(productId, images) {
    const normalized = Product.normalizeImages(images);
    await supabase.from('product_images').delete().eq('product_id', productId);

    if (!normalized.length) return [];

    const timestamp = new Date().toISOString();
    const rows = normalized.map((image, index) => ({
      product_id: productId,
      image_url: image.image_url,
      sort_order: index,
      is_thumbnail: image.is_thumbnail === true,
      alt_text: image.alt_text || null,
      created_at: timestamp,
      updated_at: timestamp
    }));

    const { data, error } = await supabase.from('product_images').insert(rows).select('*');
    if (error) throw error;
    return data || rows;
  }

  static async fetchImagesForProduct(productId) {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return Product.sortImages(data || []);
  }

  static async attachImages(product) {
    if (!product) return product;
    const images = await Product.fetchImagesForProduct(product.id);
    return Object.assign({}, product, { images });
  }

  static async attachImagesToProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return [];
    const ids = products.map((product) => product.id).filter((id) => id !== undefined && id !== null);
    if (!ids.length) return products;

    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .in('product_id', ids)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const imageMap = new Map();
    (data || []).forEach((image) => {
      if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, []);
      imageMap.get(image.product_id).push(image);
    });

    return products.map((product) => Object.assign({}, product, { images: Product.sortImages(imageMap.get(product.id) || []) }));
  }

  static pickThumbnailUrl(product, images) {
    const candidates = Array.isArray(images) ? images : [];
    const selected = candidates.find((image) => isTrueFlag(image?.is_thumbnail) || isTrueFlag(image?.isThumbnail) || isTrueFlag(image?.is_primary) || isTrueFlag(image?.isPrimary)) || candidates[0] || null;
    const fromProduct = product?.thumbnail_url || product?.thumbnailUrl || product?.image_url || product?.imageUrl || null;
    const fromImage = selected?.image_url || selected?.url || selected?.path || selected?.src || null;
    return normalizePublicImageUrl(fromProduct || fromImage || null);
  }

  static async attachThumbnailsToProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return [];
    const ids = products.map((product) => product.id).filter((id) => id !== undefined && id !== null);
    if (!ids.length) {
      return products.map((product) => Object.assign({}, product, { thumbnail_url: normalizePublicImageUrl(product.thumbnail_url || product.thumbnailUrl || null) }));
    }

    const { data, error } = await supabase
      .from('product_images')
      .select('product_id, image_url, sort_order, is_thumbnail, alt_text')
      .in('product_id', ids)
      .eq('is_thumbnail', true)
      .order('product_id', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const imageMap = new Map();
    (data || []).forEach((image) => {
      if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, []);
      imageMap.get(image.product_id).push(image);
    });

    const mapped = products.map((product) => ({
      ...product,
      thumbnail_url: Product.pickThumbnailUrl(product, imageMap.get(product.id) || [])
    }));

    // Convert any data-URI thumbnails to cached static files to avoid sending large base64 in JSON
    for (const p of mapped) {
      try {
        const thumb = p.thumbnail_url;
        if (imageCache.isDataUrl(thumb)) {
          const cached = await imageCache.cacheDataUrlToFile(thumb);
          if (cached) p.thumbnail_url = cached;
        }
      } catch (err) {
        // non-fatal
      }
    }

    return mapped;
  }

  static async create(data) {
    const { name, sku, price, compare_price, stock, category, description, featured, craft_story, blade, overall, handle, weight, grind, tang, recommended_use, comparison_rows, trust_badges, images, features, specifications, descriptions, variants, display_options } = data;
    const payload = {
      name,
      sku,
      price,
      compare_price,
      stock,
      category,
      description,
      featured,
      created_at: new Date().toISOString()
    };

    if (craft_story !== undefined) payload.craft_story = craft_story;
    if (blade !== undefined) payload.blade = blade;
    if (overall !== undefined) payload.overall = overall;
    if (handle !== undefined) payload.handle = handle;
    if (weight !== undefined) payload.weight = weight;
    if (grind !== undefined) payload.grind = grind;
    if (tang !== undefined) payload.tang = tang;
    if (recommended_use !== undefined) payload.recommended_use = recommended_use;
    if (comparison_rows !== undefined) payload.comparison_rows = comparison_rows;
    if (trust_badges !== undefined) payload.trust_badges = trust_badges;
    if (features) payload.features = features;
    if (specifications) payload.specifications = specifications;
    if (descriptions) payload.descriptions = descriptions;
    if (variants) payload.variants = variants;
    if (display_options) payload.display_options = display_options;

    let result;
    try {
      const res = await supabase.from('products').insert(payload).select('*').single();
      if (res.error) throw res.error;
      result = res.data;
    } catch (err) {
      const errMsg = String(err?.message || '').toLowerCase();
      const errCode = err?.code || '';
      if (errCode === '42703' || errMsg.includes('column') || errMsg.includes('does not exist')) {
        delete payload.features;
        delete payload.specifications;
        delete payload.descriptions;
        delete payload.variants;
        delete payload.display_options;
        const res = await supabase.from('products').insert(payload).select('*').single();
        if (res.error) throw res.error;
        result = res.data;
      } else {
        throw err;
      }
    }
    await Product.syncImages(result.id, images || []);
    return Product.attachImages(result);
  }

  static async findAll(limit = 50, offset = 0) {
    return Product.findAllWithThumbnails(limit, offset);
  }

  static async findAllWithThumbnails(limit = 50, offset = 0) {
    const start = offset;
    const end = offset + limit - 1;
    let data, error;
    ({ data, error } = await supabase.from('products').select(LIST_PRODUCT_COLUMNS).order('created_at', { ascending: false }).range(start, end));
    if (error && error.code === '42703') {
      ({ data, error } = await supabase.from('products').select(LIST_PRODUCT_COLUMNS_FALLBACK).order('created_at', { ascending: false }).range(start, end));
    }
    if (error) throw error;
    return Product.attachThumbnailsToProducts(data || []);
  }

  static async findById(id) {
    const data = await safeMaybeSingle(supabase.from('products').select('*').eq('id', id).limit(1));
    return Product.attachImages(data);
  }

  static async update(id, data) {
    const { name, sku, price, compare_price, stock, category, description, featured, craft_story, blade, overall, handle, weight, grind, tang, recommended_use, comparison_rows, trust_badges, images, features, specifications, descriptions, variants, display_options } = data;
    const payload = {};

    if (name !== undefined) payload.name = name || null;
    if (sku !== undefined) payload.sku = sku || null;
    if (price !== undefined) payload.price = price;
    if (compare_price !== undefined) payload.compare_price = compare_price;
    if (stock !== undefined) payload.stock = stock;
    if (category !== undefined) payload.category = category || null;
    if (description !== undefined) payload.description = description || null;
    if (featured !== undefined) payload.featured = featured;
    if (craft_story !== undefined) payload.craft_story = craft_story || null;
    if (blade !== undefined) payload.blade = blade || null;
    if (overall !== undefined) payload.overall = overall || null;
    if (handle !== undefined) payload.handle = handle || null;
    if (weight !== undefined) payload.weight = weight || null;
    if (grind !== undefined) payload.grind = grind || null;
    if (tang !== undefined) payload.tang = tang || null;
    if (recommended_use !== undefined) payload.recommended_use = recommended_use || null;
    if (comparison_rows !== undefined) payload.comparison_rows = comparison_rows || null;
    if (trust_badges !== undefined) payload.trust_badges = trust_badges || null;
    if (features !== undefined) payload.features = features || null;
    if (specifications !== undefined) payload.specifications = specifications || null;
    if (descriptions !== undefined) payload.descriptions = descriptions || null;
    if (variants !== undefined) payload.variants = variants || null;
    if (display_options !== undefined) payload.display_options = display_options || null;

    payload.updated_at = new Date().toISOString();

    async function doUpdate(updatePayload) {
      const res = await supabase.from('products').update(updatePayload).eq('id', id).select('*');
      if (res.error) throw res.error;
      const rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      return rows[0] || null;
    }

    let result;
    try {
      result = await doUpdate(payload);
    } catch (err) {
      const errMsg = String(err?.message || '').toLowerCase();
      const errCode = err?.code || '';
      if (errCode === '42703' || errMsg.includes('column') || errMsg.includes('does not exist')) {
        delete payload.features;
        delete payload.specifications;
        delete payload.descriptions;
        delete payload.variants;
        delete payload.display_options;
        result = await doUpdate(payload);
      } else {
        throw err;
      }
    }
    if (images !== undefined) await Product.syncImages(id, images || []);
    return Product.attachImages(result);
  }

  static async delete(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  static async getFeatured() {
    let data, error;
    ({ data, error } = await supabase.from('products').select(LIST_PRODUCT_COLUMNS).eq('featured', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }));
    if (error && error.code === '42703') {
      ({ data, error } = await supabase.from('products').select(LIST_PRODUCT_COLUMNS_FALLBACK).eq('featured', true).order('created_at', { ascending: false }));
    }
    if (error) throw error;
    
    // Return thumbnail-only data for card rendering.
    try {
      return await Product.attachThumbnailsToProducts(data || []);
    } catch (imageError) {
      console.warn('Warning: Could not fetch product images for featured:', imageError.message);
      return (data || []).map(product => Object.assign({}, product, { thumbnail_url: normalizePublicImageUrl(product.thumbnail_url || product.thumbnailUrl || null) }));
    }
  }

  static async getByCategory(category) {
    let data, error;
    ({ data, error } = await supabase.from('products').select(LIST_PRODUCT_COLUMNS).eq('category', category).order('sort_order', { ascending: true }).order('created_at', { ascending: false }));
    if (error && error.code === '42703') {
      ({ data, error } = await supabase.from('products').select(LIST_PRODUCT_COLUMNS_FALLBACK).eq('category', category).order('created_at', { ascending: false }));
    }
    if (error) throw error;
    
    // Return thumbnail-only data for card rendering.
    try {
      return await Product.attachThumbnailsToProducts(data || []);
    } catch (imageError) {
      console.warn('Warning: Could not fetch product images for category:', imageError.message);
      return (data || []).map(product => Object.assign({}, product, { thumbnail_url: normalizePublicImageUrl(product.thumbnail_url || product.thumbnailUrl || null) }));
    }
  }

  static async getTotalCount() {
    const { error, count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  }

  static async updateSortOrder(orderedIds) {
    const timestamp = new Date().toISOString();
    const results = await Promise.all(
      orderedIds.map(({ id, sort_order }) =>
        supabase.from('products').update({ sort_order, updated_at: timestamp }).eq('id', id)
      )
    );
    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;
    return true;
  }
}

module.exports = Product;
