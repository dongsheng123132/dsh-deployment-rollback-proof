# DSH 部署回滚收敛证据

这是一个离线、确定性的证据插件：验证显式清单中的每个部署目标，是否在 RTO 内停止服务失败制品，并全部收敛到同一个最近已知良好（last-known-good）摘要。

它**不执行回滚、不认证回执、不授予权限、不访问线上系统，也不证明应用业务正确**。它只验证结构化、仅含哈希的清单：目标集合完整、观察序号连续、观察者数量达标、环境绑定一致、失败版本副本为零、良好版本副本数量吻合、事件与回滚计划绑定、时间顺序/RTO/新鲜度合格。

与相邻项目的边界：`dsh-rollback` 会恢复文件，本插件不做任何部署写入；`dsh-recovery-proof` 验证隔离恢复演练，本插件验证真实事故之后的目标收敛证据；`dsh-artifact-promotion-proof` 证明正向发布，本插件证明失败版本已经退出并恢复到 LKG；回滚手册提供操作步骤，本插件提供机器可读判决。

```bash
npm test
node bin/dsh-deployment-rollback-proof.mjs verify examples/rolled-back.json
```

DSH 工具为 `dsh_deployment_rollback_inspect` 与 `dsh_deployment_rollback_verify`；独立 MCP stdio 工具为 `deployment_rollback_inspect` 与 `deployment_rollback_verify`。报告只写入显式、工作区相对的 `artifactDir`，拒绝路径逃逸和符号链接，并做内容寻址及写后回读验证。

