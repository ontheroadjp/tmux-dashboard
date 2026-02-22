# Performance Todo

- [ ] Add safety-net tests for collect_pane_detail fast-path behavior
- [ ] Commit safety net (`[/performance:wip] Safety net added`)
- [ ] Implement pane-detail fast path in collectors
- [ ] Benchmark after (same scenario/conditions as baseline)
- [ ] Run functional regression tests (backend + frontend build)
- [ ] Commit optimization (`[/performance] ...`)
- [ ] Commit regression verification (`[/performance] Regression verified`)

## Baseline (recorded)
- Scenario: collect_pane_detail synthetic large tmux state (30x10x4), warmup=10, runs=3, n=200
- Median: p50=33.377ms, p95=70.461ms, p99=270.068ms, throughput=23.97 ops/s
