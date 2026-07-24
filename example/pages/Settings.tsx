import React, { useEffect } from 'react'
import { Button, Card, Form, Input, Space, Tag, Typography, message } from 'antd'
import { usePageModified } from '../../src'

const { Title, Text } = Typography

export const SettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const { registerModifyFlag, clearModifyFlag, isModified } = usePageModified()

  useEffect(() => {
    console.log('[SettingsPage] Mounted')
    return () => {
      console.log('[SettingsPage] Unmounted - State will be lost!')
    }
  }, [])

  // 表单值变化时标记为已修改
  const handleValuesChange = () => {
    registerModifyFlag('settings', true)
  }

  return (
    <Card style={{ margin: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>设置</Title>
        <Text type="secondary">修改表单后会触发未保存提示，切换 Tab 页面状态自动保持（KeepAlive）</Text>
        <Tag color={isModified ? 'red' : 'green'}>
          {isModified ? '未保存' : '已保存'}
        </Tag>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          onFinish={() => {
            clearModifyFlag('settings')
            message.success('设置已保存')
          }}
        >
          <Form.Item label="默认主题" name="theme">
            <Input placeholder="light / dark" />
          </Form.Item>
          <Form.Item label="通知邮箱" name="email">
            <Input placeholder="example@company.com" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">保存</Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form>
      </Space>
    </Card>
  )
}
