import sanitizeHtml from 'sanitize-html';
import { AppError } from './errors';

export const MAX_SEAT_MAP_SIZE = 512 * 1024;

const ZONE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

const SVG_TAGS = [
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line',
  'text', 'tspan', 'title', 'desc', 'defs', 'linearGradient', 'radialGradient',
  'stop', 'clipPath', 'mask',
];

const SVG_ATTRIBUTES = [
  'id', 'class', 'role', 'aria-label', 'data-zone-code', 'viewBox',
  'preserveAspectRatio', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform', 'gradientUnits',
  'offset', 'stop-color', 'stop-opacity', 'fill-rule', 'clip-rule', 'clip-path',
  'mask', 'text-anchor', 'font-size', 'font-weight',
];

export interface SeatMapInspection {
  svg: string;
  zoneCodes: string[];
  missingZoneCodes: string[];
  unknownZoneCodes: string[];
}

export function normalizeZoneCode(value: string): string {
  return value.trim().toUpperCase();
}

export function assertZoneCode(value: string): string {
  const normalized = normalizeZoneCode(value);
  if (!ZONE_CODE_PATTERN.test(normalized)) {
    throw new AppError(
      400,
      'ZONE_CODE_INVALID',
      'Mã khu vực chỉ được gồm chữ A-Z, số, dấu gạch ngang hoặc gạch dưới và dài tối đa 32 ký tự.'
    );
  }
  return normalized;
}

export function inspectSeatMapSvg(input: string, ticketZoneCodes: string[]): SeatMapInspection {
  if (!input.trim() || Buffer.byteLength(input, 'utf8') > MAX_SEAT_MAP_SIZE) {
    throw new AppError(400, 'SEAT_MAP_INVALID', 'File SVG rỗng hoặc vượt quá 512 KiB.');
  }

  const svg = sanitizeHtml(input, {
    allowedTags: SVG_TAGS,
    allowedAttributes: { '*': SVG_ATTRIBUTES },
    disallowedTagsMode: 'discard',
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    },
    transformTags: {
      '*': (tagName, attribs) => {
        const zoneCode = attribs['data-zone-code'];
        if (zoneCode) {
          attribs['data-zone-code'] = assertZoneCode(zoneCode);
        }
        for (const attribute of ['fill', 'stroke', 'clip-path', 'mask']) {
          const value = attribs[attribute];
          if (value?.includes('url(') && !/^url\(#[A-Za-z][\w:.-]*\)$/.test(value)) {
            delete attribs[attribute];
          }
        }
        return { tagName, attribs };
      },
    },
  }).trim();

  if (!/^<svg\b/i.test(svg) || !/<\/svg>$/i.test(svg)) {
    throw new AppError(400, 'SEAT_MAP_INVALID', 'File phải có một phần tử gốc <svg>.');
  }
  if (!/\bviewBox\s*=\s*["'][^"']+["']/i.test(svg)) {
    throw new AppError(400, 'SEAT_MAP_INVALID', 'SVG phải có thuộc tính viewBox để hiển thị responsive.');
  }

  const zoneCodes = Array.from(
    new Set(
      Array.from(svg.matchAll(/\bdata-zone-code\s*=\s*["']([^"']+)["']/gi)).map((match) =>
        assertZoneCode(match[1])
      )
    )
  );
  const expected = Array.from(new Set(ticketZoneCodes.map(assertZoneCode)));
  const missingZoneCodes = expected.filter((code) => !zoneCodes.includes(code));
  const unknownZoneCodes = zoneCodes.filter((code) => !expected.includes(code));

  return { svg, zoneCodes, missingZoneCodes, unknownZoneCodes };
}

export function sanitizeAndValidateSeatMapSvg(input: string, ticketZoneCodes: string[]): SeatMapInspection {
  const result = inspectSeatMapSvg(input, ticketZoneCodes);
  if (result.missingZoneCodes.length || result.unknownZoneCodes.length) {
    const messages = [];
    if (result.missingZoneCodes.length) {
      messages.push(`thiếu khu vực: ${result.missingZoneCodes.join(', ')}`);
    }
    if (result.unknownZoneCodes.length) {
      messages.push(`khu vực không tồn tại: ${result.unknownZoneCodes.join(', ')}`);
    }
    throw new AppError(400, 'SEAT_MAP_ZONE_MISMATCH', `SVG không khớp loại vé (${messages.join('; ')}).`);
  }
  return result;
}
