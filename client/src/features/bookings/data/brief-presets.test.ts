import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_OBJECTIVES,
  PROHIBITED_PRESETS,
  findObjective,
  scenePresetsFor,
} from './brief-presets';

describe('gợi ý brief theo mục tiêu', () => {
  it('mỗi mục tiêu có đủ bản nháp để brand sửa thay vì bắt đầu từ ô trống', () => {
    for (const objective of CAMPAIGN_OBJECTIVES) {
      // Bản nháp phải qua được ràng buộc tối thiểu 10 ký tự của form.
      expect(objective.objectiveDraft.trim().length).toBeGreaterThanOrEqual(10);
      expect(objective.keyMessageHint.trim().length).toBeGreaterThan(0);
      expect(objective.suggestedScenes.length).toBeGreaterThan(0);
      expect(objective.suggestedProhibited.length).toBeGreaterThan(0);
    }
  });

  it('id các mục tiêu là duy nhất — dùng làm khoá khi render danh sách', () => {
    const ids = CAMPAIGN_OBJECTIVES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tra được mục tiêu theo id, id lạ trả undefined', () => {
    expect(findObjective('launch')?.label).toBe('Ra mắt sản phẩm mới');
    expect(findObjective('khong-ton-tai')).toBeUndefined();
  });
});

describe('scenePresetsFor', () => {
  it('ghép gợi ý theo lĩnh vực với nhóm dùng chung', () => {
    const fnb = scenePresetsFor('f&b');

    expect(fnb).toContain('Cận cảnh món ăn/đồ uống');
    expect(fnb).toContain('Nêu rõ địa chỉ cửa hàng');
  });

  it('lĩnh vực lạ vẫn có nhóm dùng chung để chọn', () => {
    // Category do creator tự đặt nên không thể liệt kê hết — không được trả rỗng.
    const unknown = scenePresetsFor('nong-san-sach');

    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown).toContain('Cận cảnh sản phẩm');
  });

  it('không phân biệt hoa thường và khoảng trắng thừa', () => {
    expect(scenePresetsFor('  F&B ')).toEqual(scenePresetsFor('f&b'));
  });

  it('không có mục trùng lặp sau khi ghép hai nhóm', () => {
    const scenes = scenePresetsFor('lifestyle');
    expect(new Set(scenes).size).toBe(scenes.length);
  });
});

describe('PROHIBITED_PRESETS', () => {
  it('có đủ các giới hạn hay gặp và không trùng nhau', () => {
    expect(PROHIBITED_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(PROHIBITED_PRESETS).size).toBe(PROHIBITED_PRESETS.length);
  });
});
