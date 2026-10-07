import * as cheerio from 'cheerio';
import type {
  SecurityReviewFinding,
  SecurityReviewResult,
  SecurityReviewSeverity,
} from '@seo/shared';

export interface ReviewSiteSecurityInput {
  url: string;
  requestedUrl?: string;
  requestCount?: number;
  responseHeaders: Record<string, string>;
  setCookieHeaders?: string[];
  html?: string;
  contentType?: string;
}

const DEDUCTIONS: Record<SecurityReviewSeverity, number> = {
  critical: 30,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

function sanitizedUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function gradeForScore(score: number): SecurityReviewResult['grade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}

function hasDirective(csp: string, directive: string): boolean {
  const parts = csp.split(';').map((part) => part.trim().toLowerCase());
  return parts.some((part) => part === directive || part.startsWith(directive + ' '));
}

function directiveSources(csp: string, directive: string): string[] | null {
  const normalizedDirective = directive.toLowerCase();
  for (const rawPart of csp.split(';')) {
    const parts = rawPart.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts[0] === normalizedDirective) return parts.slice(1);
  }
  return null;
}

function containsCspToken(csp: string, token: string): boolean {
  const normalizedToken = token.toLowerCase();
  return csp.split(';').some((rawPart) => {
    const parts = rawPart.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return parts.slice(1).includes(normalizedToken);
  });
}

function lowerCaseHeaders(input: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) output[key.toLowerCase()] = value;
  return output;
}

function addFinding(
  findings: SecurityReviewFinding[],
  finding: Omit<SecurityReviewFinding, 'assessed'> & { assessed?: boolean },
): void {
  findings.push({
    ...finding,
    assessed: finding.assessed ?? true,
  });
}

export function reviewSiteSecurity(input: ReviewSiteSecurityInput): SecurityReviewResult {
  const headers = lowerCaseHeaders(input.responseHeaders);
  const findings: SecurityReviewFinding[] = [];
  const url = new URL(input.url);
  const requestedUrl = new URL(input.requestedUrl || input.url);
  const isHttps = url.protocol === 'https:';
  const upgradedToHttps = requestedUrl.protocol === 'http:' && isHttps;
  const csp = headers['content-security-policy'] || '';
  const xFrameOptions = headers['x-frame-options'] || '';
  const setCookies = input.setCookieHeaders || [];

  addFinding(findings, isHttps ? {
    id: 'SEC-TRANSPORT-001',
    title: 'HTTPS',
    category: 'transport',
    severity: 'info',
    status: 'pass',
    evidence: upgradedToHttps
      ? '入力されたHTTP URLはHTTPSへリダイレクトされ、最終レスポンスはHTTPSでした。'
      : '最終レスポンスURLはHTTPSです。',
    risk: upgradedToHttps
      ? 'HTTPSへの移行を確認しました。HTTP入口では恒久リダイレクトの運用も継続確認してください。'
      : '通信経路の暗号化を確認しました。',
    remediation: 'HTTPSを継続し、証明書更新を自動化してください。',
  } : {
    id: 'SEC-TRANSPORT-001',
    title: 'HTTPS',
    category: 'transport',
    severity: 'high',
    status: 'fail',
    evidence: '対象URLがHTTPです。',
    risk: '通信内容の盗聴・改ざんや認証情報漏えいの危険があります。',
    remediation: 'HTTPSへ移行し、HTTPからHTTPSへ恒久リダイレクトしてください。',
  });

  if (isHttps) {
    const hsts = headers['strict-transport-security'];
    if (!hsts) {
      addFinding(findings, {
        id: 'SEC-HDR-001',
        title: 'HSTS',
        category: 'headers',
        severity: 'medium',
        status: 'warning',
        evidence: 'Strict-Transport-Security ヘッダーがありません。',
        risk: '最初のHTTPアクセス時にHTTPS強制が効かない場合があります。',
        remediation: 'HTTPS運用を確認した上でHSTSを設定してください。',
      });
    } else {
      const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] || 0);
      addFinding(findings, {
        id: 'SEC-HDR-001',
        title: 'HSTS',
        category: 'headers',
        severity: maxAge >= 15_552_000 ? 'info' : 'low',
        status: maxAge >= 15_552_000 ? 'pass' : 'warning',
        evidence: maxAge >= 15_552_000
          ? 'HSTSが有効で、max-ageは180日以上です。'
          : 'HSTSはありますが、max-ageが短いか判定できません。',
        risk: maxAge >= 15_552_000
          ? 'HTTPS強制設定を確認しました。'
          : '短いmax-ageではHTTPS強制の保護期間が限定されます。',
        remediation: maxAge >= 15_552_000
          ? '運用要件に応じてincludeSubDomains/preloadを検討してください。'
          : '運用確認後、十分なmax-ageへ段階的に延長してください。',
      });
    }
  } else {
    addFinding(findings, {
      id: 'SEC-HDR-001',
      title: 'HSTS',
      category: 'headers',
      severity: 'info',
      status: 'unassessed',
      assessed: false,
      evidence: 'HTTPページではHSTSを有効な保護として評価しません。',
      risk: '未評価です。',
      remediation: '先にHTTPSへ移行してください。',
    });
  }

  if (!csp) {
    addFinding(findings, {
      id: 'SEC-CSP-001',
      title: 'Content Security Policy',
      category: 'csp',
      severity: 'high',
      status: 'warning',
      evidence: 'Content-Security-Policy ヘッダーがありません。',
      risk: 'XSS等の影響をブラウザー側で制限する防御層が不足します。',
      remediation: '実際の配信リソースを棚卸しし、段階的にCSPを導入してください。',
    });
  } else {
    addFinding(findings, {
      id: 'SEC-CSP-001',
      title: 'Content Security Policy',
      category: 'csp',
      severity: 'info',
      status: 'pass',
      evidence: 'Content-Security-Policy ヘッダーを確認しました。',
      risk: 'CSPの存在のみで安全性を保証するものではありません。',
      remediation: 'report-onlyや違反レポートも利用し、継続的にポリシーを調整してください。',
    });

    if (containsCspToken(csp, "'unsafe-eval'")) {
      addFinding(findings, {
        id: 'SEC-CSP-002',
        title: 'CSP unsafe-eval',
        category: 'csp',
        severity: 'high',
        status: 'warning',
        evidence: "CSPに 'unsafe-eval' が含まれます。",
        risk: '動的コード評価を許可し、XSS時の影響を拡大する場合があります。',
        remediation: '依存コードを確認し、可能ならunsafe-eval依存を除去してください。',
      });
    }

    if (containsCspToken(csp, "'unsafe-inline'")) {
      addFinding(findings, {
        id: 'SEC-CSP-003',
        title: 'CSP unsafe-inline',
        category: 'csp',
        severity: 'medium',
        status: 'warning',
        evidence: "CSPに 'unsafe-inline' が含まれます。",
        risk: 'インラインスクリプトやスタイルの制限が弱くなる場合があります。',
        remediation: 'nonce/hashベースへ移行できるか検討してください。',
      });
    }

    if (containsCspToken(csp, '*')) {
      addFinding(findings, {
        id: 'SEC-CSP-004',
        title: 'CSP wildcard source',
        category: 'csp',
        severity: 'medium',
        status: 'warning',
        evidence: 'CSPソースにワイルドカードが含まれます。',
        risk: '許可範囲が広く、CSPの制限効果が弱くなる場合があります。',
        remediation: '必要なオリジン・スキームへ許可範囲を絞ってください。',
      });
    }

    if (!hasDirective(csp, 'object-src')) {
      addFinding(findings, {
        id: 'SEC-CSP-005',
        title: 'CSP object-src',
        category: 'csp',
        severity: 'low',
        status: 'warning',
        evidence: 'object-src ディレクティブが明示されていません。',
        risk: 'プラグイン系コンテンツの許可範囲がdefault-srcへ依存します。',
        remediation: "不要なら object-src 'none' を検討してください。",
      });
    }

    if (!hasDirective(csp, 'base-uri')) {
      addFinding(findings, {
        id: 'SEC-CSP-006',
        title: 'CSP base-uri',
        category: 'csp',
        severity: 'low',
        status: 'warning',
        evidence: 'base-uri ディレクティブが明示されていません。',
        risk: 'base要素の悪用をCSPで制限できません。',
        remediation: "要件に応じて base-uri 'self' または 'none' を設定してください。",
      });
    }
  }

  const contentTypeOptions = (headers['x-content-type-options'] || '').toLowerCase();
  addFinding(findings, contentTypeOptions === 'nosniff' ? {
    id: 'SEC-HDR-002',
    title: 'X-Content-Type-Options',
    category: 'headers',
    severity: 'info',
    status: 'pass',
    evidence: 'X-Content-Type-Options: nosniff を確認しました。',
    risk: 'MIME sniffing抑止が有効です。',
    remediation: '設定を維持してください。',
  } : {
    id: 'SEC-HDR-002',
    title: 'X-Content-Type-Options',
    category: 'headers',
    severity: 'medium',
    status: 'warning',
    evidence: 'X-Content-Type-Options: nosniff を確認できません。',
    risk: 'ブラウザーのMIME推測で意図しない解釈が起きる可能性があります。',
    remediation: 'X-Content-Type-Options: nosniff を設定してください。',
  });

  if (headers['referrer-policy']) {
    addFinding(findings, {
      id: 'SEC-HDR-003',
      title: 'Referrer-Policy',
      category: 'headers',
      severity: 'info',
      status: 'pass',
      evidence: 'Referrer-Policy ヘッダーを確認しました。',
      risk: 'リファラー情報の送信範囲を制御できます。',
      remediation: 'サービス要件に合うポリシーか継続確認してください。',
    });
  } else {
    addFinding(findings, {
      id: 'SEC-HDR-003',
      title: 'Referrer-Policy',
      category: 'headers',
      severity: 'low',
      status: 'warning',
      evidence: 'Referrer-Policy ヘッダーがありません。',
      risk: '遷移先へ不要なURL情報が送られる場合があります。',
      remediation: 'strict-origin-when-cross-origin等、要件に合うポリシーを設定してください。',
    });
  }

  if (!headers['permissions-policy']) {
    addFinding(findings, {
      id: 'SEC-HDR-004',
      title: 'Permissions-Policy',
      category: 'headers',
      severity: 'info',
      status: 'info',
      evidence: 'Permissions-Policy ヘッダーはありません。',
      risk: '機能利用制限がブラウザー既定値に依存します。すべてのサイトで必須ではありません。',
      remediation: 'カメラ・マイク・位置情報等を使わない場合は明示的な制限を検討してください。',
    });
  } else {
    addFinding(findings, {
      id: 'SEC-HDR-004',
      title: 'Permissions-Policy',
      category: 'headers',
      severity: 'info',
      status: 'pass',
      evidence: 'Permissions-Policy ヘッダーを確認しました。',
      risk: 'ブラウザー機能の利用範囲を制御できます。',
      remediation: '必要最小限の許可になっているか確認してください。',
    });
  }

  const frameAncestors = csp && hasDirective(csp, 'frame-ancestors');
  if (frameAncestors || xFrameOptions) {
    addFinding(findings, {
      id: 'SEC-HDR-005',
      title: 'Framing protection',
      category: 'headers',
      severity: 'info',
      status: 'pass',
      evidence: frameAncestors
        ? 'CSP frame-ancestors を確認しました。'
        : 'X-Frame-Options を確認しました。',
      risk: 'クリックジャッキング対策の設定を確認しました。',
      remediation: '埋め込み要件と整合する設定を維持してください。',
    });
  } else {
    addFinding(findings, {
      id: 'SEC-HDR-005',
      title: 'Framing protection',
      category: 'headers',
      severity: 'medium',
      status: 'warning',
      evidence: 'CSP frame-ancestors と X-Frame-Options の両方を確認できません。',
      risk: '第三者サイトのiframeへ埋め込まれ、クリックジャッキングに悪用される場合があります。',
      remediation: 'CSP frame-ancestors を優先して導入し、必要に応じてX-Frame-Optionsも併用してください。',
    });
  }

  const crossOriginHeaders = [
    headers['cross-origin-opener-policy'],
    headers['cross-origin-resource-policy'],
    headers['cross-origin-embedder-policy'],
  ].filter(Boolean).length;
  addFinding(findings, {
    id: 'SEC-HDR-006',
    title: 'Cross-Origin isolation headers',
    category: 'headers',
    severity: 'info',
    status: 'info',
    evidence: crossOriginHeaders > 0
      ? 'COOP/CORP/COEPのうち ' + crossOriginHeaders + ' 件を確認しました。'
      : 'COOP/CORP/COEPは確認できませんでした。',
    risk: 'これらはサイト要件に依存し、欠如だけで脆弱性とは判定しません。',
    remediation: 'クロスオリジン分離が必要な機能を使う場合のみ適切に導入してください。',
  });

  if (setCookies.length === 0) {
    addFinding(findings, {
      id: 'SEC-COOKIE-001',
      title: 'Cookie flags',
      category: 'cookies',
      severity: 'info',
      status: 'info',
      evidence: 'このレスポンスではSet-Cookieを確認できませんでした。',
      risk: 'Cookieを使用していないか、別レスポンスで設定している可能性があります。',
      remediation: '認証Cookieが別経路で設定される場合は、そのレスポンスも別途確認してください。',
    });
  } else {
    const missingSecure = setCookies.filter((value) => !/;\s*secure(?:;|$)/i.test(value)).length;
    const missingHttpOnly = setCookies.filter((value) => !/;\s*httponly(?:;|$)/i.test(value)).length;
    const missingSameSite = setCookies.filter((value) => !/;\s*samesite=/i.test(value)).length;

    if (isHttps && missingSecure > 0) {
      addFinding(findings, {
        id: 'SEC-COOKIE-002',
        title: 'Cookie Secure flag',
        category: 'cookies',
        severity: 'medium',
        status: 'warning',
        evidence: 'Set-Cookie ' + setCookies.length + ' 件中 ' + missingSecure + ' 件でSecureを確認できません。',
        risk: 'Cookieが暗号化されていない通信へ送られる余地が生じます。',
        remediation: 'HTTPS専用CookieにはSecureを付与してください。',
      });
    }
    if (missingHttpOnly > 0) {
      addFinding(findings, {
        id: 'SEC-COOKIE-003',
        title: 'Cookie HttpOnly flag',
        category: 'cookies',
        severity: 'medium',
        status: 'warning',
        evidence: 'Set-Cookie ' + setCookies.length + ' 件中 ' + missingHttpOnly + ' 件でHttpOnlyを確認できません。',
        risk: 'JavaScriptからCookieへアクセスできるため、XSS時の影響が増える場合があります。',
        remediation: 'JavaScriptから不要な認証・セッションCookieにはHttpOnlyを付与してください。',
      });
    }
    if (missingSameSite > 0) {
      addFinding(findings, {
        id: 'SEC-COOKIE-004',
        title: 'Cookie SameSite',
        category: 'cookies',
        severity: 'low',
        status: 'warning',
        evidence: 'Set-Cookie ' + setCookies.length + ' 件中 ' + missingSameSite + ' 件でSameSiteを確認できません。',
        risk: 'クロスサイト送信の制御がブラウザー既定値に依存します。',
        remediation: '用途に応じてSameSite=Lax/Strict/Noneを明示してください。',
      });
    }
    if (missingSecure === 0 && missingHttpOnly === 0 && missingSameSite === 0) {
      addFinding(findings, {
        id: 'SEC-COOKIE-001',
        title: 'Cookie flags',
        category: 'cookies',
        severity: 'info',
        status: 'pass',
        evidence: 'このレスポンスのSet-CookieではSecure/HttpOnly/SameSiteを確認しました。',
        risk: '主要なCookie属性を確認しました。Cookie値自体は保存していません。',
        remediation: '用途ごとに属性が適切か継続確認してください。',
      });
    }
  }

  const allowOrigin = (headers['access-control-allow-origin'] || '').trim();
  const allowCredentials = (headers['access-control-allow-credentials'] || '').trim().toLowerCase() === 'true';
  if (allowOrigin === '*' && allowCredentials) {
    addFinding(findings, {
      id: 'SEC-CORS-001',
      title: 'CORS wildcard with credentials',
      category: 'cors',
      severity: 'high',
      status: 'fail',
      evidence: 'Access-Control-Allow-Origin: * と credentials許可が同時に見えます。',
      risk: 'CORS設計が不整合または過剰許可になっている可能性があります。',
      remediation: 'credentialを使う場合は許可Originを明示し、動的反映時はallowlist検証してください。',
    });
  } else if (allowOrigin === '*') {
    addFinding(findings, {
      id: 'SEC-CORS-001',
      title: 'CORS wildcard',
      category: 'cors',
      severity: 'low',
      status: 'warning',
      evidence: 'Access-Control-Allow-Origin: * を確認しました。',
      risk: '公開API以外では意図しない第三者Originから読み取られる場合があります。',
      remediation: '公開APIでなければ許可Originを必要な範囲へ限定してください。',
    });
  } else if (allowOrigin) {
    addFinding(findings, {
      id: 'SEC-CORS-001',
      title: 'CORS response',
      category: 'cors',
      severity: 'info',
      status: 'info',
      evidence: 'CORS許可Originがレスポンスに設定されています。',
      risk: 'この受動レビューだけではOrigin反射やallowlistの完全性は判定しません。',
      remediation: 'サーバー側allowlist実装を別途レビューしてください。',
    });
  } else {
    addFinding(findings, {
      id: 'SEC-CORS-001',
      title: 'CORS response',
      category: 'cors',
      severity: 'info',
      status: 'pass',
      evidence: 'このレスポンスではAccess-Control-Allow-Originを確認できませんでした。',
      risk: '少なくとも通常GETレスポンスで広いCORS許可は観測されていません。',
      remediation: 'APIエンドポイントでは個別に確認してください。',
    });
  }

  const contentType = (input.contentType || headers['content-type'] || '').toLowerCase();
  const html = input.html || '';
  const htmlReviewed = Boolean(html) && (contentType.includes('html') || contentType.includes('xhtml') || /^\s*</.test(html));

  if (htmlReviewed) {
    const $ = cheerio.load(html);
    const mixed = new Set<string>();
    if (isHttps) {
      $('script[src], img[src], iframe[src], video[src], audio[src], source[src], link[href], form[action]').each((_, element) => {
        const attr = element.tagName === 'link' || element.tagName === 'form' ? (element.tagName === 'link' ? 'href' : 'action') : 'src';
        const value = $(element).attr(attr)?.trim();
        if (!value) return;
        try {
          const resolved = new URL(value, url);
          if (resolved.protocol === 'http:') mixed.add(element.tagName);
        } catch {
          // malformed subresource URLs are outside this passive security review
        }
      });
    }

    if (mixed.size > 0) {
      addFinding(findings, {
        id: 'SEC-HTML-001',
        title: 'Mixed content',
        category: 'html',
        severity: 'high',
        status: 'warning',
        evidence: 'HTTPSページ内にHTTP参照を確認しました。対象要素: ' + Array.from(mixed).join(', '),
        risk: '一部通信が暗号化されず、ブラウザーでブロックまたは改ざんされる場合があります。',
        remediation: 'HTTP参照をHTTPSまたは同一オリジン相対URLへ変更してください。',
      });
    } else if (isHttps) {
      addFinding(findings, {
        id: 'SEC-HTML-001',
        title: 'Mixed content',
        category: 'html',
        severity: 'info',
        status: 'pass',
        evidence: '取得HTML内ではHTTPサブリソース参照を確認できませんでした。',
        risk: '取得したHTML範囲の受動確認です。動的挿入は対象外です。',
        remediation: '実ブラウザーのCSPレポート等も併用してください。',
      });
    }

    const passwordInputs = $('input[type="password"]').length;
    if (!isHttps && passwordInputs > 0) {
      addFinding(findings, {
        id: 'SEC-HTML-002',
        title: 'Password form over HTTP',
        category: 'html',
        severity: 'critical',
        status: 'fail',
        evidence: 'HTTPページにpassword入力欄を確認しました。',
        risk: '認証情報が盗聴・改ざんされる危険があります。',
        remediation: 'ログイン画面を含むサイト全体をHTTPS化してください。',
      });
    }

    let insecureFormActions = 0;
    if (isHttps) {
      $('form[action]').each((_, element) => {
        const action = $(element).attr('action')?.trim();
        if (!action) return;
        try {
          if (new URL(action, url).protocol === 'http:') insecureFormActions += 1;
        } catch {
          // ignore malformed form actions here
        }
      });
    }
    if (insecureFormActions > 0) {
      addFinding(findings, {
        id: 'SEC-HTML-003',
        title: 'Insecure form action',
        category: 'html',
        severity: 'high',
        status: 'fail',
        evidence: 'HTTPSページからHTTPへ送信するform actionを ' + insecureFormActions + ' 件確認しました。',
        risk: 'フォーム送信内容が暗号化されない可能性があります。',
        remediation: '送信先をHTTPSへ変更してください。',
      });
    }

    let externalScriptsWithoutSri = 0;
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src')?.trim();
      if (!src) return;
      try {
        const resolved = new URL(src, url);
        if (resolved.origin !== url.origin && !$(element).attr('integrity')) {
          externalScriptsWithoutSri += 1;
        }
      } catch {
        // ignore
      }
    });
    if (externalScriptsWithoutSri > 0) {
      addFinding(findings, {
        id: 'SEC-HTML-004',
        title: 'External script integrity',
        category: 'html',
        severity: 'info',
        status: 'info',
        evidence: '外部scriptのうちSRI属性なしを ' + externalScriptsWithoutSri + ' 件確認しました。',
        risk: 'SRIはすべての配信方式で必須ではありませんが、固定CDN資産では改ざん検知に役立ちます。',
        remediation: '固定バージョンの第三者scriptではintegrity/crossoriginの利用可否を検討してください。',
      });
    }
  } else {
    addFinding(findings, {
      id: 'SEC-HTML-000',
      title: 'HTML passive checks',
      category: 'html',
      severity: 'info',
      status: 'unassessed',
      assessed: false,
      evidence: 'HTML本文を評価できないContent-Typeまたは空レスポンスでした。',
      risk: 'Mixed contentやフォーム等のHTML項目は未評価です。',
      remediation: 'HTMLページURLを指定してください。',
    });
  }

  if (headers['x-powered-by']) {
    addFinding(findings, {
      id: 'SEC-INFO-001',
      title: 'X-Powered-By disclosure',
      category: 'information',
      severity: 'low',
      status: 'warning',
      evidence: 'X-Powered-By ヘッダーが公開されています。',
      risk: '実装技術の推測材料を増やします。これだけで脆弱性確定ではありません。',
      remediation: '不要ならヘッダーを削除してください。',
    });
  }
  if (headers['server']) {
    addFinding(findings, {
      id: 'SEC-INFO-002',
      title: 'Server header disclosure',
      category: 'information',
      severity: 'info',
      status: 'info',
      evidence: 'Server ヘッダーが公開されています。',
      risk: 'サーバー実装の推測材料になる場合があります。',
      remediation: '詳細バージョン等を公開している場合は最小化を検討してください。',
    });
  }

  const score = Math.max(0, findings.reduce((current, finding) => {
    if (!finding.assessed || (finding.status !== 'fail' && finding.status !== 'warning')) return current;
    return current - DEDUCTIONS[finding.severity];
  }, 100));

  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    unassessed: 0,
  };
  for (const finding of findings) {
    if (!finding.assessed || finding.status === 'unassessed') {
      summary.unassessed += 1;
      continue;
    }
    if (finding.status === 'pass') continue;
    summary[finding.severity] += 1;
  }

  const order: Record<SecurityReviewSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  findings.sort((a, b) => {
    if (a.assessed !== b.assessed) return a.assessed ? -1 : 1;
    if (a.status === 'pass' && b.status !== 'pass') return 1;
    if (a.status !== 'pass' && b.status === 'pass') return -1;
    return order[a.severity] - order[b.severity];
  });

  return {
    url: sanitizedUrl(input.url),
    reviewedAt: new Date().toISOString(),
    score,
    grade: gradeForScore(score),
    summary,
    findings,
    scope: {
      mode: 'passive',
      requestCount: Math.max(1, input.requestCount || 1),
      htmlReviewed,
      note: '公開GETレスポンスの取得チェーンだけを評価します。requestCountには安全に追跡したredirect hopも含みます。能動的な攻撃テストは実施しません。',
    },
  };
}
