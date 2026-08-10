import { IconTrash } from '../../../shared/components/icons';
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
      <label className="social-item__platform">
        <span className="visually-hidden">Nền tảng tài khoản {index + 1}</span>
        <select
          className="select"
          value={account.platform}
          onChange={(event) => onChange({ platform: event.target.value as SocialPlatform })}
          disabled={readOnly}
        >
          {SOCIAL_PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="icon-button icon-button--danger"
        onClick={onRemove}
        disabled={readOnly}
        aria-label={`Xóa tài khoản ${index + 1}`}
        title="Xóa tài khoản"
      >
        <IconTrash />
      </button>
    </div>
    <div className="field-grid">
      <label className="form-field field--half">
        <span>Handle</span>
        <input
          type="text"
          className="input"
          value={account.handle}
          onChange={(event) => onChange({ handle: event.target.value })}
          placeholder="@username"
          disabled={readOnly}
        />
      </label>
      <label className="form-field field--half">
        <span>Followers</span>
        <input
          type="number"
          className="input"
          value={account.followerCount}
          onChange={(event) => onChange({ followerCount: Number(event.target.value) })}
          min={0}
          disabled={readOnly}
        />
      </label>
      <label className="form-field field--full">
        <span>URL kênh</span>
        <input
          type="url"
          className="input"
          value={account.url}
          onChange={(event) => onChange({ url: event.target.value })}
          placeholder="https://..."
          disabled={readOnly}
        />
      </label>
    </div>
  </div>
);
