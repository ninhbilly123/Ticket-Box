import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from './errors';

const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function generateVietnameseArtistBio(cleanedText: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(500, 'GEMINI_API_KEY_MISSING', 'Chua cau hinh GEMINI_API_KEY.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = [
    'Hay viet mot doan gioi thieu nghe si bang tieng Viet cho trang chi tiet concert.',
    'Yeu cau: ngan gon, truc quan, giu thong tin quan trong, khong phong dai qua muc.',
    'Do dai khoang 120-180 tu. Chi tra ve noi dung bio, khong them tieu de.',
    '',
    'Noi dung ho so nghe si:',
    cleanedText,
  ].join('\n');

  let result;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (error: unknown) {
      if (attempt === 3 || !isTransientGeminiError(error)) {
        throw error;
      }
      await delay(attempt * 1500);
    }
  }

  if (!result) {
    throw new AppError(502, 'GEMINI_EMPTY_RESPONSE', 'Gemini khong tra ve noi dung bio.');
  }

  const text = result.response.text().trim();
  if (!text) {
    throw new AppError(502, 'GEMINI_EMPTY_RESPONSE', 'Gemini khong tra ve noi dung bio.');
  }
  return text;
}
