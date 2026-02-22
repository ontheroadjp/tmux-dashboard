# Performance Todo

- [x] Add safety-net tests for collect_pane_detail fast-path behavior
- [x] Commit safety net (`[/performance:wip] Safety net added`)
- [x] Implement pane-detail fast path in collectors
- [x] Benchmark after (same scenario/conditions as baseline)
- [x] Run functional regression tests (backend + frontend build)
- [ ] Commit optimization (`[/performance] ...`)
- [ ] Commit regression verification (`[/performance] Regression verified`)

## Baseline (recorded)
- Scenario: collect_pane_detail synthetic large tmux state (30x10x4), warmup=10, runs=3, n=200
- Median: p50=33.377ms, p95=70.461ms, p99=270.068ms, throughput=23.97 ops/s

## After (recorded)
- Scenario: collect_pane_detail synthetic large tmux state (30x10x4), warmup=10, runs=3, n=200
- Median: p50=0.050ms, p95=0.073ms, p99=0.092ms, throughput=17738.27 ops/s

## Delta
- p50: -99.85%
- p95: -99.90%
- p99: -99.97%
- throughput: +73884.06%
