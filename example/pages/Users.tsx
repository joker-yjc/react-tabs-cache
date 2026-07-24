import React from 'react'
import { Button, Card, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

export const UsersPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <Card style={{ margin: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>用户管理</Title>
        <Text type="secondary">选择一个用户进入详情，验证动态路由参数</Text>
        <Space wrap>
          {[101, 102, 103].map((id) => (
            <Button key={id} onClick={() => navigate(`/users/${id}`)}>
              查看用户 {id}
            </Button>
          ))}
        </Space>
      </Space>
    </Card>
  )
}
