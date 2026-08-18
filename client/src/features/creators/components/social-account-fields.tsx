import { IconTrash } from '../../../shared/components/icons';
import { IconButton, Input, Select } from '../../../shared/components/ui';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../types/creator-types';

export interface SocialDraft {
  readonly platform: SocialPlatform;
  readonly handle: string;
  readonly url: string;
  readonly followerCount: number;
}

interface SocialAccountFieldsProps {
  readonly account: SocialDraft;
  readonly index: number;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<SocialDraft>) => void;
  readonly onRemove: () => void;
}

/** Một tài khoản mạng xã hội — sub-card gọn, tách khỏi form chính (CRE-003). */
export const SocialAccountFields = ({
  account,
  index,
  readOnly,
  onChange,
  onRemove,
}: SocialAccountFieldsProps) => (
  <div className="social-item">
    <div className="social-item__head">
      <Select
        aria-label={`Nền tảng tài khoản ${index + 1}`}
        fieldClassName="social-item__platform"
        options={SOCIAL_PLATFORMS.map((platform) => ({ value: platform, label: platform }))}
        value={account.platform}
        onChange={(platform) => onChange({ platform: platform as SocialPlatform })}
        disabled={readOnly}
      />
      <IconButton
        label={`Xóa tài khoản ${index + 1}`}
        title="Xóa tài khoản"
        tone="danger"
        icon={<IconTrash />}
        onClick={onRemove}
        disabled={readOnly}
      />
    </div>
    <div className="field-grid">
      <Input
        label="Handle"
        span="half"
        value={account.handle}
        onChange={(event) => onChange({ handle: event.target.value })}
        placeholder="@username"
        disabled={readOnly}
      />
      <Input
        label="Followers"
        span="half"
        type="number"
        value={account.followerCount}
        onChange={(event) => onChange({ followerCount: Number(event.target.value) })}
        min={0}
        disabled={readOnly}
      />
      <Input
        label="URL kênh"
        span="full"
        type="url"
        value={account.url}
        onChange={(event) => onChange({ url: event.target.value })}
        placeholder="https://..."
        disabled={readOnly}
      />
    </div>
  </div>
);
