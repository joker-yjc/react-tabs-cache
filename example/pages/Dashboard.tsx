import React, { useEffect, useState } from 'react'
import { Card, Space, Statistic, Tag, Typography } from 'antd'
import { useRouteEnterCallback } from '../../src'

const { Title, Text } = Typography

export const DashboardPage: React.FC = () => {
  const { registerCallback, unregisterCallback } = useRouteEnterCallback()
  const [enterCount, setEnterCount] = useState(0)

  useEffect(() => {
    const callback = () => setEnterCount((prev) => prev + 1)
    registerCallback(callback)
    console.log("dashbord mounted")
    return () => {
      unregisterCallback(callback)
      console.log("dashbord unmounted")
    }
  }, [])

  return (
    <Card style={{ margin: 16 }}>
      <Space direction="vertical" size={12}>
        <Title level={5} style={{ margin: 0 }}>仪表板</Title>
        <Text type="secondary">切换标签页会触发路由进入回调</Text>
        <Space>
          <Statistic title="进入次数" value={enterCount} />
          <Tag color="blue">Route Enter Callback</Tag>
        </Space>
      </Space>
    </Card>
  )
}
