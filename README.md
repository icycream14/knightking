# 왕의기사Zero

이 저장소는 왕의기사Zero_2.17ver.scx 기반 브라우저 게임 전용입니다.
SSS급 회귀 기사와 다른 게임입니다.

저장소: https://github.com/icycream14/knightking
배포: https://kings-knight-zero-solo.super-soldier.chatgpt.site
배포 식별자: appgprj_6adb8acf6e188191a8e9a1b63983726f
배포 폴더: dist
저장 키: kings-knight-zero-solo-v1

## 실행과 검사

정적 웹 서버로 dist 폴더를 제공합니다. 별도 빌드는 필요하지 않습니다.
변경 전 AGENTS.md와 PROJECT_IDENTITY.json을 읽습니다.
`node test.cjs`는 프로젝트 경계, 구문, 사건 실행, 이동 패드, 네이티브 통행 및 저장과 업그레이드를 검사합니다.
`node verify-project.cjs --site <project_id> --remote <url>`로 배포 대상과 저장소를 검증합니다.
`git config core.hooksPath hooks`를 설정하면 이 체크아웃의 push 시 검사가 실행됩니다.

## 현재 구현

원본 맵 65,536개 타일, 원본 배치 유닛 937개, 트리거 3,009개를 보존합니다.
원본 CV5/VF4의 8px 통행 격자와 건물 범위로 이동, 돌진, 경로를 검사합니다.
원본 지형 이미지와 GRP 기반 유닛 이미지를 사용합니다. 임의의 새 그래픽으로 교체하지 않습니다.
원본 iscript 프레임으로 대기, 이동, 공격 모션을 선택합니다.
화면에서 시작하는 가변 패드는 터치 해제, 취소, 다중 터치와 메뉴 진입을 처리합니다.
원본 조건과 행동 실행기는 기사 선택, 유닛, 위치, 자원, 메시지, 소유권, 명령과 오디오에 연결돼 있습니다.
원본 UPGx 가격과 PUPx 제한을 사용하는 무기와 방어구 업그레이드는 장비, 설정과 상점에서 접근합니다.

## 확인 범위

60초 모의 실행에서 사건 실행 오류와 미지원 유형 카운터는 0이었습니다.
이 검사는 모든 원본 사건 분기의 완전한 구현이나 엔딩까지의 실제 플레이를 입증하지 않습니다.
스타크래프트 내부 RTS AI는 브라우저 전투 로직으로 근사합니다. Android 실기 FPS는 측정하지 않았습니다.

## 분리와 복구 기록

2026-10-26 SSS급 회귀 기사 사이트는 이 대화의 잘못된 배포 이전 Site 버전 18로 복구했습니다.
그 게임의 GitHub에서 잘못 추가한 v0.43.7 변경은 복구 커밋 38143027fc2d79ffbd22ac92f6383fe68a665c38로 되돌렸습니다.
이 저장소에는 그 게임의 코드, 그래픽, 저장 데이터와 배포 설정을 가져오지 않습니다.
자동 GitHub Actions 배포는 추가하지 않았습니다. GitHub 저장과 Sites 배포는 별도 작업이며 각각 성공을 확인해야 합니다.

## 원본과 출처

원본 맵: 사용자가 제공한 왕의기사Zero_2.17ver.scx, 제작자 Nyx)..UELTER
그래픽 저작권: Blizzard Entertainment
맵 그래픽 디코딩 참고: https://github.com/dada78641/bwmapgfx
유닛 연결 참고: https://github.com/ShieldBattery/bw-chk
오디오: 원본 SCX에 포함된 파일
