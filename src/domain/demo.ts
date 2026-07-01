export const DEMO_UMBRELLA_IDS = ["umb-29", "umb-30", "umb-31"] as const;

export const DEMO_STUDENT_ID = "00000";

export function isDemoUmbrella(umbrellaId: string): boolean {
  return (DEMO_UMBRELLA_IDS as readonly string[]).includes(umbrellaId);
}

/**
 * URL 쿼리스트링에서 `u` 딥링크 값을 읽어, 등록된 데모 우산일 때만 그 id를
 * 반환한다. 실제 재고/오탈자/누락은 모두 null → 딥링크가 실제 인벤토리
 * 대여를 자동 시작하는 일이 없다.
 */
export function parseDemoDeepLink(search: string): string | null {
  const params = new URLSearchParams(search);
  const umbrellaId = params.get("u");
  if (umbrellaId && isDemoUmbrella(umbrellaId)) {
    return umbrellaId;
  }
  return null;
}

/** 데모 우산의 FO 딥링크 상대경로. 예: "/fo?u=umb-29" */
export function demoDeepLinkPath(umbrellaId: string): string {
  return `/fo?u=${umbrellaId}`;
}
