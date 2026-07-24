import React, { useEffect } from 'react'
import { Button, Card, Form, Input, Select, Space, Tag, Typography, message } from 'antd'
import { usePageModified, useTabsCache } from '../../src'

const { Title, Text } = Typography

export const RequirementIntakePage: React.FC = () => {
  const [form] = Form.useForm()
  const { registerModifyFlag, clearModifyFlag, isModified } = usePageModified()
  const { activeTab, loadCache, saveCache } = useTabsCache()

  // 组件挂载时尝试恢复缓存的表单值
  // useEffect(() => {
  //   if (!activeTab) return
  //   const restoreForm = async () => {
  //     const cached = await loadCache(activeTab.id)
  //     if (cached && cached.formValues) {
  //       form.setFieldsValue(cached.formValues)
  //     }
  //   }
  //   restoreForm()
  // }, [activeTab, form, loadCache])

  // 表单值变化时缓存到 Tab
  const handleValuesChange = async (_: any, allValues: any) => {
    registerModifyFlag('requirement', true)
    if (activeTab) {
      await saveCache(activeTab.id, { formValues: allValues })
    }
  }

  return (
    <Card style={{ margin: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>需求介入示例</Title>
        <Text type="secondary">用于验证未保存提示与缓存行为，切换 Tab 可恢复草稿</Text>
        <Tag color={isModified ? 'red' : 'green'}>
          {isModified ? '未提交' : '已提交'}
        </Tag>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          onFinish={(values) => {
            clearModifyFlag('requirement')
            message.success(`需求已提交：${values.title}`)
          }}
        >
          <Form.Item label="需求标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="例如：新增订单审批流程" />
          </Form.Item>
          <Form.Item label="优先级" name="priority" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
              ]}
            />
          </Form.Item>
          <Form.Item label="需求说明" name="detail" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="补充业务背景与验收标准" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">提交需求</Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form>
      </Space>
    </Card>
  )
}