import { z } from 'zod';

/** Regex id PortfolioItem — repo nhận id do caller cung cấp (`item_` + uuid). */
const PORTFOLIO_ITEM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const portfolioItemParamsSchema = z.object({
  itemId: z.string().regex(PORTFOLIO_ITEM_ID_PATTERN, 'ID mục portfolio không hợp lệ.'),
});

export type PortfolioItemParams = z.infer<typeof portfolioItemParamsSchema>;

/** Body cho nhánh JSON — thêm link ngoài (CRE-004). */
export const linkPortfolioItemSchema = z.object({
  type: z.literal('link'),
  url: z.url('URL không hợp lệ.'),
  caption: z.string().trim().max(200).optional(),
  category: z.string().trim().max(50).optional(),
});

export type LinkPortfolioItemBody = z.infer<typeof linkPortfolioItemSchema>;

/** Body multipart sau khi multer parse — caption/category là text field tùy chọn. */
export const multipartPortfolioBodySchema = z.object({
  caption: z.string().trim().max(200).optional(),
  category: z.string().trim().max(50).optional(),
});

export type MultipartPortfolioBody = z.infer<typeof multipartPortfolioBodySchema>;
