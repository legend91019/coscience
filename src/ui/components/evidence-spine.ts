export type SpineStep = {
  key: 'hypothesis' | 'run' | 'evidence' | 'decision'
  title: string
  detail: string
}

export function evidenceSpineSteps(): SpineStep[] {
  return [
    { key: 'hypothesis', title: '假设', detail: '明确研究问题、范围和可验证预测。' },
    { key: 'run', title: '运行', detail: '记录节点、随机种子和执行环境。' },
    { key: 'evidence', title: '证据', detail: '保存结果、局限和来源追溯。' },
    { key: 'decision', title: '决策', detail: '由人选择下一条研究分支。' },
  ]
}
