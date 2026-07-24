import React from 'react'
import { Card, Descriptions, Tag } from 'antd'
import { useParams } from 'react-router-dom'

export const UserDetailPage: React.FC = () => {
  const { id } = useParams()

  return (
    <Card style={{ margin: 16 }}>
      <Descriptions title="用户详情" column={1}>
        <Descriptions.Item label="用户ID">{id}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color="green">活跃</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="说明">
          动态路由参数会进入 Tab 元信息
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
