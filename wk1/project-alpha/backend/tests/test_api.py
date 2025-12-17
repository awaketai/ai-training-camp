import pytest
from httpx import AsyncClient
from fastapi import status
from main import app

@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Welcome to Ticket Management API"}

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_create_and_get_tag():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 创建标签
        tag_data = {"name": "test-tag", "color": "#ff0000"}
        create_response = await ac.post("/api/tags", json=tag_data)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_tag = create_response.json()
        assert created_tag["name"] == tag_data["name"]
        assert created_tag["color"] == tag_data["color"]
        
        # 获取标签列表
        list_response = await ac.get("/api/tags")
        assert list_response.status_code == status.HTTP_200_OK
        tags = list_response.json()
        assert any(tag["id"] == created_tag["id"] for tag in tags)

@pytest.mark.asyncio
async def test_ticket_crud_operations():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 1. 创建一个测试标签
        tag_data = {"name": "test-ticket-tag", "color": "#00ff00"}
        tag_response = await ac.post("/api/tags", json=tag_data)
        tag = tag_response.json()
        
        # 2. 创建工单
        ticket_data = {
            "title": "Test Ticket",
            "description": "This is a test ticket",
            "status": "open",
            "priority": "high",
            "tag_ids": [tag["id"]]
        }
        create_response = await ac.post("/api/tickets", json=ticket_data)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_ticket = create_response.json()
        assert created_ticket["title"] == ticket_data["title"]
        assert created_ticket["status"] == ticket_data["status"]
        assert created_ticket["priority"] == ticket_data["priority"]
        assert any(t["id"] == tag["id"] for t in created_ticket["tags"])
        
        # 3. 获取工单列表
        list_response = await ac.get("/api/tickets")
        assert list_response.status_code == status.HTTP_200_OK
        tickets = list_response.json()
        assert any(ticket["id"] == created_ticket["id"] for ticket in tickets)
        
        # 4. 获取单个工单
        detail_response = await ac.get(f"/api/tickets/{created_ticket['id']}")
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.json()["id"] == created_ticket["id"]
        
        # 5. 更新工单
        update_data = {
            "title": "Updated Test Ticket",
            "description": "Updated description",
            "status": "in_progress",
            "priority": "medium",
            "tag_ids": [tag["id"]]
        }
        update_response = await ac.put(f"/api/tickets/{created_ticket['id']}", json=update_data)
        assert update_response.status_code == status.HTTP_200_OK
        updated_ticket = update_response.json()
        assert updated_ticket["title"] == update_data["title"]
        assert updated_ticket["status"] == update_data["status"]
        assert updated_ticket["priority"] == update_data["priority"]
        
        # 6. 删除工单
        delete_response = await ac.delete(f"/api/tickets/{created_ticket['id']}")
        assert delete_response.status_code == status.HTTP_200_OK
        
        # 验证工单已删除
        get_after_delete_response = await ac.get(f"/api/tickets/{created_ticket['id']}")
        assert get_after_delete_response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_ticket_filters():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 创建测试标签
        tag_data = {"name": "filter-tag", "color": "#0000ff"}
        tag_response = await ac.post("/api/tags", json=tag_data)
        tag = tag_response.json()
        
        # 创建多个测试工单
        ticket1 = {
            "title": "Open High Priority Ticket",
            "description": "Test ticket 1",
            "status": "open",
            "priority": "high",
            "tag_ids": [tag["id"]]
        }
        ticket2 = {
            "title": "In Progress Medium Priority Ticket",
            "description": "Test ticket 2",
            "status": "in_progress",
            "priority": "medium",
            "tag_ids": [tag["id"]]
        }
        
        await ac.post("/api/tickets", json=ticket1)
        await ac.post("/api/tickets", json=ticket2)
        
        # 测试状态过滤
        open_tickets_response = await ac.get("/api/tickets?status=open")
        open_tickets = open_tickets_response.json()
        assert all(ticket["status"] == "open" for ticket in open_tickets)
        
        # 测试优先级过滤
        high_priority_response = await ac.get("/api/tickets?priority=high")
        high_priority_tickets = high_priority_response.json()
        assert all(ticket["priority"] == "high" for ticket in high_priority_tickets)
        
        # 测试标签ID过滤
        tag_filter_response = await ac.get(f"/api/tickets?tag_id={tag['id']}")
        tag_filter_tickets = tag_filter_response.json()
        assert all(any(t["id"] == tag["id"] for t in ticket["tags"]) for ticket in tag_filter_tickets)
