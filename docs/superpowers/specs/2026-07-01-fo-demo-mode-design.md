# FO 체험(데모) 모드 설계

- 작성일: 2026-07-01
- 브랜치: `feature/fo-demo-mode`
- 상태: 설계 확정, 구현 대기

## 목표

배포된 링크를 처음 방문한 외부인이 **물리적 우산 QR 없이도, 진짜로 QR을 카메라로 찍는 행위를 포함한** 대여·반납 흐름 전체를 체험할 수 있게 한다.

성공 기준:
- 방문자가 자기 폰 기본 카메라로 화면의 QR을 찍으면, 폰에서 실제 대여 흐름이 시작된다.
- 체험은 **실제 백엔드**로 동작하되, 실제 학생에게 빌려주는 우산 재고(umb-1~28)와 **운영 데이터를 오염시키지 않는다.**
- 폰이 하나뿐이거나 QR을 못 찍는 방문자도 막히지 않는다.

## 배경 / 현재 구조

- FO 흐름(`src/app/fo/FoFlow.tsx`): 홈(대여/반납 선택) → QR 스캔(`ScannerPanel`, 카메라) → (대여) 학번 입력 → 처리 → 결과.
- QR에는 우산 id 문자열(`umb-N`)이 들어 있고, 앱 내부 스캐너(`@zxing/browser`)가 읽어 `umbrellaId`로 사용한다.
- 대여/반납 API(`/api/rentals/borrow`, `/api/rentals/return`)는 **관리자 인증 없이** 접근 가능(FO는 공개 화면). 실제 Supabase `umbrellas`/`rentals`/`blacklists`를 변경한다.
- 인벤토리는 `umb-1`~`umb-28` 28개(마이그레이션 `reseed_umbrellas`).

핵심 제약(물리):
- **카메라는 자기 화면을 못 찍는다.** 따라서 "화면에 QR을 띄우고 그 폰으로 찍기"는 불가능. QR은 반드시 *찍는 폰이 아닌 다른 표면*(노트북/모니터 화면, 종이)에 있어야 한다. → 배포 링크(원격) 시나리오에서는 "방문자가 노트북/PC로 랜딩을 보다가 폰으로 화면의 QR을 찍는" 그림을 기본으로 한다.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 대상/목적 | 외부 공개 체험 (누구나 링크로) |
| 데이터 격리 | 전용 데모 우산 `umb-29`/`umb-30`/`umb-31` (실제 행, 이미 생성됨). 별도 DB/스키마 없음 |
| 우산 선택 방식 | 진짜 QR 스캔 = **딥링크 QR** (폰 기본 카메라로 열림) |
| 체험 장소 | 배포 링크(원격) |
| BO 노출 | 데모 우산도 BO 목록에 **보이게**, 라벨 `(체험용)`로 구분 |

데모 우산은 아래 SQL로 이미 생성됨(재현용으로 마이그레이션화 권장):

```sql
insert into public.umbrellas (id, label, qr_payload, status, number)
values
  ('umb-29', '29번 우산 (체험용)', 'umb-29', 'available', 29),
  ('umb-30', '30번 우산 (체험용)', 'umb-30', 'available', 30),
  ('umb-31', '31번 우산 (체험용)', 'umb-31', 'available', 31);
```

## 설계

### 공유 상수

`DEMO_UMBRELLA_IDS = ['umb-29', 'umb-30', 'umb-31']` — allowlist·리셋·QR 생성이 모두 이 한 곳을 참조한다. (예: `src/domain/demo.ts`)

### 1. 진입점

- `ModePicker`(FO 홈) 하단에 작은 텍스트 링크 **`🧪 테스트하러 왔어요`** 추가 → `/fo/demo`로 이동.
- 실제 운영 화면의 대여/반납 버튼 크기·위계는 건드리지 않는다(체험 진입은 눈에 안 띄는 보조 요소).

### 2. `/fo/demo` — 체험 안내 화면

신규 라우트. 클라이언트 컴포넌트(`DemoPanel`)에서:
- 마운트 시 `POST /api/demo/reset` 호출 → 데모 우산 3개를 깨끗한 상태로 초기화(아래 4번).
- 각 데모 우산의 **딥링크 QR 3개**를 렌더. QR이 인코딩하는 값은 순수 텍스트가 아니라 절대 URL:
  `${window.location.origin}/fo?u=umb-29` (QR 생성은 기존 `qrcode` 라이브러리 재사용, `PrintableLabels`와 동일 패턴).
- 안내 문구: "폰 카메라로 QR을 찍어보세요."
- 맨 아래 폴백: **`QR 못 찍겠으면 눌러서 체험`** — 데모 우산 3개(29/30/31) 버튼. 누르면 같은 기기에서 `/fo?u=umb-29`로 이동해 흐름 시작.

### 3. 딥링크 처리 (`FoFlow` / `/fo`)

- `/fo`가 쿼리 파라미터 `?u=<umbrellaId>`를 읽는다.
- **allowlist 검증**: `u`가 `DEMO_UMBRELLA_IDS`에 있을 때만 자동 시작. (그래야 `?u=umb-5` 같은 값으로 실제 재고 우산이 원격 대여되는 구멍이 생기지 않는다.)
- 유효한 데모 `u`면: `umbrellaId` 세팅, 기본 모드 `borrow`, 곧바로 `student_id` 스텝으로 착지("29번 우산 스캔됨 → 학번 입력"). `isDemo=true` 표시.
- allowlist 밖 `u`는 무시하고 평소처럼 홈 표시.

### 4. 데이터 안전장치

- **리셋 엔드포인트** `POST /api/demo/reset` (신규):
  ```sql
  update rentals  set returned_at = now() where umbrella_id in (DEMO_IDS) and returned_at is null;
  update umbrellas set status = 'available', updated_at = now() where id in (DEMO_IDS);
  ```
  - 하드코딩된 `DEMO_UMBRELLA_IDS`에만 작동. 요청 본문으로 대상 id를 받지 않는다(임의 우산 리셋 방지).
  - 활성 데모 대여를 삭제하지 않고 `returned_at`만 채워 FK(blacklists.rental_id) 문제를 피한다.
  - 관리자 인증 없음(공개 데모 필요). 신규 인증 표면이지만 3개 id로 하드 스코프되어 악용 여지 없음.
- **멈춤 방지**: 누가 데모 우산을 빌리고 안 돌려줘도, 다음 방문자가 `/fo/demo`를 열면 리셋되어 항상 대여 가능.
- **블랙리스트 충돌 회피**: 데모는 즉시 대여→반납이라 연체가 발생하지 않아 블랙리스트가 걸리지 않는다. 연체/블랙리스트 경로는 데모에서 노출하지 않는다.

### 5. 전체 수명주기 체험 ("반납도 해보기")

- 데모 대여 성공 결과 화면(`ResultScreen`, `isDemo`일 때)에 버튼 **`방금 빌린 N번 반납해보기`** 추가 → `returnUmbrella(umbrellaId)` 호출.
- 한 번의 QR 스캔으로 대여→반납 전체를 체험.

## 데이터 흐름 (해피 패스, 원격)

1. 방문자(노트북)가 `/fo` → `🧪 테스트하러 왔어요` → `/fo/demo`.
2. `/fo/demo` 마운트 → `POST /api/demo/reset` (29/30/31 초기화).
3. 화면에 딥링크 QR 3개 표시.
4. 방문자가 폰 카메라로 `umb-30` QR 촬영 → 폰 브라우저가 `/fo?u=umb-30` 오픈.
5. `FoFlow`가 allowlist 통과 확인 → "30번 우산 → 학번 입력" 스텝.
6. 학번 입력 → `POST /api/rentals/borrow` → `umb-30` status `borrowed`, `rentals` 행 생성.
7. 결과 화면 → `반납도 해보기` → `POST /api/rentals/return` → status `available`.

## 에러 처리

- 카메라 권한/촬영 실패는 데모의 관심사가 아님(딥링크는 방문자의 기본 카메라 앱이 처리). FO 내부 스캐너는 데모 경로에서 사용하지 않는다.
- allowlist 밖 `?u=` → 조용히 홈으로.
- 이미 대여 중(리셋 사이 경합 등) → 기존 `friendlyBorrowError`("이미 대여 중…") 그대로. 폴백 버튼/재리셋으로 회복.
- `/api/demo/reset` 실패 → `/fo/demo`는 QR을 계속 표시(리셋은 best-effort). 실패해도 체험 자체는 가능.

## 테스트

- 단위: `?u=` 파싱 + allowlist 판정 헬퍼 — 데모 id는 통과, `umb-5`/빈값/잘못된 형식은 거부.
- 단위: `/api/demo/reset` 이 `DEMO_UMBRELLA_IDS` 이외 행을 절대 건드리지 않음(스코프 검증).
- e2e(Playwright): `/fo/demo` → `/fo?u=umb-29` → 대여 → `반납도 해보기` → 반납 성공.

## 범위 밖 (YAGNI)

- 실제 운영 QR을 딥링크로 전환하는 것(별도 UX 개선 과제).
- 리셋 크론/스케줄러(열 때 리셋으로 충분).
- 별도 데모 DB/스키마.
- 연체·블랙리스트 데모 시나리오.
