import React from 'react'
import { Card, Progress, Space, Typography } from 'antd'

const { Title, Text } = Typography

export const ReportsPage: React.FC = () => {
  return (
    <Card style={{ margin: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>报表概览</Title>
        <Text type="secondary">模拟统计数据展示</Text>
        <Progress percent={72} status="active" />
        <Progress percent={48} status="active" />
      </Space>
    </Card>
  )
}
