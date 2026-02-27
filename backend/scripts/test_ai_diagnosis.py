#!/usr/bin/env python3
import sys
import time
import requests
from datetime import datetime
from pathlib import Path

BASE = "http://localhost:8000/api/v1"


def main():
    if len(sys.argv) < 2:
        print("사용법: python scripts/test_ai_diagnosis.py /path/to/leak_photo.jpg")
        sys.exit(1)
    
    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(f"파일을 찾을 수 없어요: {image_path}")
        sys.exit(1)
    
    print(f"이미지: {image_path}")
    print("=" * 50)
    
    print("\n[1/5] 로그인...")
    login = requests.post(f"{BASE}/auth/login", json={
        "email": "tech1@sigongcore.test",
        "password": "tech123!"
    })
    
    if login.status_code != 200:
        print(f"로그인 실패: {login.text}")
        sys.exit(1)
    
    token = login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ 로그인 성공")
    
    print("\n[2/5] 프로젝트 조회...")
    projects = requests.get(f"{BASE}/projects", headers=headers)
    proj_id = projects.json()["data"][0]["id"]
    print(f"✅ 프로젝트: {proj_id}")
    
    print("\n[3/5] 현장방문 생성...")
    visit = requests.post(
        f"{BASE}/projects/{proj_id}/site-visits",
        headers=headers,
        json={
            "project_id": proj_id,
            "visit_type": "initial",
            "visited_at": datetime.now().isoformat(),
            "notes": "AI 진단 테스트"
        }
    )
    
    if visit.status_code not in [200, 201]:
        print(f"현장방문 생성 실패: {visit.text}")
        sys.exit(1)
    
    visit_id = visit.json()["data"]["id"]
    print(f"✅ 현장방문: {visit_id}")
    
    print("\n[4/5] 사진 업로드...")
    with open(image_path, "rb") as f:
        files = {"file": (image_path.name, f, "image/jpeg")}
        data = {"photo_type": "before"}
        
        upload = requests.post(
            f"{BASE}/site-visits/{visit_id}/photos",
            headers=headers,
            files=files,
            data=data
        )
    
    if upload.status_code not in [200, 201]:
        print(f"사진 업로드 실패: {upload.text}")
        sys.exit(1)
    
    photo_id = upload.json()["data"]["id"]
    print(f"✅ 사진 업로드: {photo_id}")
    
    print("\n[5/5] AI 진단 요청...")
    diagnosis = requests.post(
        f"{BASE}/site-visits/{visit_id}/diagnose",
        headers=headers,
        json={"site_visit_id": visit_id}
    )
    
    if diagnosis.status_code not in [200, 201, 202]:
        print(f"진단 요청 실패: {diagnosis.text}")
        sys.exit(1)
    
    diagnosis_id = diagnosis.json()["data"]["diagnosis_id"]
    print(f"✅ 진단 시작: {diagnosis_id}")
    
    print("\n진단 결과 대기 중...")
    for i in range(30):
        result = requests.get(f"{BASE}/diagnoses/{diagnosis_id}", headers=headers)
        
        if result.status_code != 200:
            print(f"진단 조회 실패: {result.text}")
            break
        
        data = result.json()["data"]
        status = data["status"]
        
        if status == "completed":
            print("\n" + "=" * 50)
            print("🎉 AI 진단 완료!")
            print("=" * 50)
            print(f"\n📋 누수 소견서:\n{data['leak_opinion_text']}")
            
            if data.get("confidence_score"):
                score = float(data['confidence_score'])
                print(f"\n📊 신뢰도: {score*100:.1f}%")
            
            if data.get("suggested_materials"):
                print(f"\n📦 추천 자재:")
                for m in data["suggested_materials"]:
                    print(f"  - {m['suggested_name']}: {m.get('suggested_quantity', '?')} {m.get('suggested_unit', '')}")
            
            if data.get("processing_time_ms"):
                print(f"\n⏱️ 처리 시간: {data['processing_time_ms']/1000:.1f}초")
            break
        
        elif status == "failed":
            print(f"\n❌ 진단 실패")
            break
        
        else:
            print(f"  상태: {status} ({i+1}/30)")
            time.sleep(2)
    else:
        print("\n⏰ 시간 초과 - 나중에 다시 확인하세요")
        print(f"진단 ID: {diagnosis_id}")


if __name__ == "__main__":
    main()
