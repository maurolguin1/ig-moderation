import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { supabaseServerClient } from './supabaseClient';

export interface SearchFilters {
  query?: string;
  username?: string;
  levelMin?: number;
  levelMax?: number;
  ataque?: boolean;
  polaridad?: string[];
  tipoAcoso?: string[];
  from?: string;
  to?: string;
  videoSource?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

/**
 * Import comments into Supabase database. Deduplicates by comment_id and counts inserted/duplicates/errors.
 */
export async function importComments(buffer: Buffer, fileName: string, videoSource: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  let inserted = 0;
  let duplicates = 0;
  let errors = 0;
  for (const row of json) {
    try {
      const commentId = row['Comment Id'] || row['commentId'] || row['comment_id'];
      if (!commentId) {
        errors++;
        continue;
      }
      // Check if exists
      const { data: existing, error: selErr } = await supabaseServerClient
        .from('comments')
        .select('id')
        .eq('comment_id', String(commentId))
        .maybeSingle();
      if (selErr) {
        errors++;
        continue;
      }
      // Map fields
      const newRow: any = {
        comment_id: String(commentId),
        user_id: String(row['User Id'] || row['userId'] || row['user_id'] || ''),
        username: String(row['Username'] || row['username'] || ''),
        comment_text: String(row['Comment Text'] || row['commentText'] || row['comment_text'] || ''),
        profile_url: row['Profile URL'] || row['profileUrl'] || row['profile_url'] || null,
        date: row['Date'] ? new Date(row['Date']).toISOString() : new Date().toISOString(),
        video_source: videoSource || String(row['videoSource'] || row['Video Source'] || ''),
        etiqueta_agresion: row['Etiqueta_Agresión'] || row['Etiqueta_Agresion'] || null,
        nivel_agresion: row['Nivel_Agresión'] || row['Nivel_Agresion'] ? Number(row['Nivel_Agresión'] || row['Nivel_Agresion']) : null,
        color_agresion_hex: row['Color_Agresión_Hex'] || row['Color_Agresion_Hex'] || null,
        polaridad_postura: row['Polaridad_Postura'] || row['polaridadPostura'] || null,
        tipo_acoso: row['Tipo_Acoso'] || row['tipoAcoso'] || null,
        es_ataque: row['Es_Ataque'] != null ? (row['Es_Ataque'] === true || row['Es_Ataque'] === 'sí' || row['Es_Ataque'] === 'si') : null,
        notas: row['Notas'] || null,
      };
      if (existing) {
        duplicates++;
        // Optionally update existing row with newRow values
        await supabaseServerClient.from('comments').update(newRow).eq('comment_id', String(commentId));
      } else {
        const { error: insErr } = await supabaseServerClient.from('comments').insert(newRow);
        if (insErr) {
          errors++;
        } else {
          inserted++;
        }
      }
    } catch (e) {
      errors++;
    }
  }
  return { fileName, total: json.length, inserted, duplicates, errors };
}

/**
 * Perform search with filters using Supabase full text search and field filters.
 */
export async function searchComments(filters: SearchFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const offset = (page - 1) * limit;
  let query = supabaseServerClient.from('comments').select('*', { count: 'exact' });
  if (filters.username) query = query.eq('username', filters.username);
  if (filters.levelMin != null) query = query.gte('nivel_agresion', filters.levelMin);
  if (filters.levelMax != null) query = query.lte('nivel_agresion', filters.levelMax);
  if (typeof filters.ataque === 'boolean') query = query.eq('es_ataque', filters.ataque);
  if (filters.polaridad && filters.polaridad.length > 0) query = query.in('polaridad_postura', filters.polaridad);
  if (filters.tipoAcoso && filters.tipoAcoso.length > 0) {
    // Postgres: LIKE
    filters.tipoAcoso.forEach((val) => {
      query = query.ilike('tipo_acoso', `%${val}%`);
    });
  }
  if (filters.from) query = query.gte('date', filters.from);
  if (filters.to) query = query.lte('date', filters.to);
  if (filters.videoSource) query = query.eq('video_source', filters.videoSource);
  if (filters.query) {
    // Use full text search (websearch) with Spanish config
    query = query.textSearch('comment_text', filters.query, { config: 'spanish', type: 'plain' });
  }
  // Sorting
  if (filters.sort) {
    switch (filters.sort) {
      case 'date_asc':
        query = query.order('date', { ascending: true });
        break;
      case 'level_desc':
        query = query.order('nivel_agresion', { ascending: false });
        break;
      case 'level_asc':
        query = query.order('nivel_agresion', { ascending: true });
        break;
      default:
        query = query.order('date', { ascending: false });
    }
  } else {
    query = query.order('date', { ascending: false });
  }
  query = query.range(offset, offset + limit - 1);
  const { data, count, error } = await query;
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

/**
 * Compute facets (totals and distributions) by fetching all comments and aggregating in memory.
 */
export async function computeFacets() {
  // Fetch up to 10000 comments
  const { data, error } = await supabaseServerClient.from('comments').select('*');
  if (error) throw error;
  const items = data || [];
  const total = items.length;
  const ataques = items.filter((c: any) => c.es_ataque === true).length;
  const videosMap: Record<string, number> = {};
  const usersSet = new Set<string>();
  const nivelesMap: Record<number, number> = {};
  items.forEach((c: any) => {
    const video = c.video_source || 'Sin nombre';
    videosMap[video] = (videosMap[video] || 0) + 1;
    usersSet.add(c.username);
    if (c.nivel_agresion != null) {
      nivelesMap[c.nivel_agresion] = (nivelesMap[c.nivel_agresion] || 0) + 1;
    }
  });
  return {
    total,
    ataques,
    videos: Object.entries(videosMap).map(([videoSource, count]) => ({ videoSource, _count: { _all: count } })),
    usuarios: usersSet.size,
    niveles: Object.entries(nivelesMap).map(([nivel, count]) => ({ nivelAgresion: Number(nivel), _count: { _all: count } })),
  };
}

/**
 * Compare groups based on filter sets.
 */
export async function compareGroups(filterSets: SearchFilters[]) {
  const results = [] as any[];
  for (const fs of filterSets) {
    const { items } = await searchComments({ ...fs, page: 1, limit: 10000 });
    const total = items.length;
    const ataques = items.filter((c: any) => c.es_ataque === true).length;
    const nivelesMap: Record<number, number> = {};
    items.forEach((c: any) => {
      if (c.nivel_agresion != null) {
        nivelesMap[c.nivel_agresion] = (nivelesMap[c.nivel_agresion] || 0) + 1;
      }
    });
    results.push({ total, ataques, niveles: Object.entries(nivelesMap).map(([level, count]) => ({ level: Number(level), count })) });
  }
  return results;
}

/**
 * Generate PDF report summarising metrics using pdfkit.
 */
export async function generatePdfReport(filters: SearchFilters, title: string) {
  const { items } = await searchComments({ ...filters, page: 1, limit: 100 });
  const metrics = await computeFacets();
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (buf: Buffer) => buffers.push(buf));
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Total comentarios: ${metrics.total}`);
  doc.text(`% ataques: ${((metrics.ataques / metrics.total) * 100).toFixed(2)}%`);
  doc.moveDown();
  doc.text('Top 10 comentarios:');
  items.slice(0, 10).forEach((c: any, idx: number) => {
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').text(`${idx + 1}. ${c.username} (${dayjs(c.date).format('YYYY-MM-DD')}):`, { continued: true });
    doc.font('Helvetica').text(` ${c.comment_text}`);
  });
  doc.end();
  await new Promise<void>((resolve) => doc.on('end', resolve));
  return Buffer.concat(buffers);
}

/**
 * Generate PPTX report summarising metrics using pptxgenjs.
 */
export async function generatePptxReport(filters: SearchFilters, title: string) {
  const { items } = await searchComments({ ...filters, page: 1, limit: 50 });
  const metrics = await computeFacets();
  const PPTX = require('pptxgenjs');
  const pptx = new PPTX();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
  pptx.layout = 'LAYOUT_16x9';
  let slide = pptx.addSlide();
  slide.background = { fill: 'F5F5F5' };
  slide.addText(title, { x: 0.5, y: 1.5, w: 9, h: 1.0, fontSize: 32, color: '333333', align: pptx.AlignH.center });
  slide.addText(`Total comentarios: ${metrics.total}\n% ataques: ${((metrics.ataques / metrics.total) * 100).toFixed(2)}%`, { x: 1, y: 3.0, w: 8, h: 1.0, fontSize: 14, color: '666666', align: pptx.AlignH.center });
  slide = pptx.addSlide();
  slide.background = { fill: 'FFFFFF' };
  slide.addText('Top 5 comentarios', { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: 24, color: '333333' });
  const topItems = items.slice(0, 5).map((c: any, idx: number) => {
    return {
      text: `${idx + 1}. ${c.username} (${dayjs(c.date).format('YYYY-MM-DD')}): ${c.comment_text.substring(0, 120)}${c.comment_text.length > 120 ? '...' : ''}`,
      options: { fontSize: 12, color: '333333', breakLine: true },
    };
  });
  slide.addText(topItems, { x: 0.5, y: 1.5, w: 9, h: 3.5, wrap: true });
  const buffer = await pptx.write('arraybuffer');
  return Buffer.from(buffer);
}

/**
 * Generate Excel export of comments matching filters.
 */
export async function generateXlsxExport(filters: SearchFilters) {
  const { items } = await searchComments({ ...filters, page: 1, limit: 10000 });
  const wsData = [
    [
      'Comment Id',
      'User Id',
      'Username',
      'Comment Text',
      'Profile URL',
      'Date',
      'Video Source',
      'Etiqueta_Agresion',
      'Nivel_Agresion',
      'Color_Agresion_Hex',
      'Polaridad_Postura',
      'Tipo_Acoso',
      'Es_Ataque',
      'Notas',
    ],
    ...items.map((c: any) => [
      c.comment_id,
      c.user_id,
      c.username,
      c.comment_text,
      c.profile_url,
      c.date,
      c.video_source,
      c.etiqueta_agresion,
      c.nivel_agresion,
      c.color_agresion_hex,
      c.polaridad_postura,
      c.tipo_acoso,
      c.es_ataque,
      c.notas,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Comments');
  const xlsxBuffer: Buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return xlsxBuffer;
}