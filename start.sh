#!/bin/bash
set -e

# ============================================================
# Engineering Asset Registry — 一键启动/重启脚本
# 用法:
#   ./start.sh         启动（若已运行则提示）
#   ./start.sh restart 强制重启
#   ./start.sh stop    停止所有服务
#   ./start.sh status  查看运行状态
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="$SCRIPT_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PORT=8000
FRONTEND_PORT=8123

mkdir -p "$LOG_DIR"

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ---- 工具函数 ----
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 通过端口获取 PID
pid_by_port() {
    ss -tlnp 2>/dev/null | awk -v port="$1" '$0 ~ ":"port" " { match($0, /pid=([0-9]+)/, a); print a[1] }' | head -1
}

# ---- 停止服务 ----
stop_services() {
    log_info "正在停止服务..."

    local backend_pid frontend_pid
    backend_pid=$(pid_by_port $BACKEND_PORT)
    frontend_pid=$(pid_by_port $FRONTEND_PORT)

    if [ -n "$backend_pid" ]; then
        kill "$backend_pid" 2>/dev/null && log_info "后端已停止 (PID: $backend_pid)" || true
    fi
    if [ -n "$frontend_pid" ]; then
        kill "$frontend_pid" 2>/dev/null && log_info "前端已停止 (PID: $frontend_pid)" || true
    fi

    # 如果进程是由脚本用 nohup 启动的，可能还有子进程，再等一小会儿
    sleep 1

    # 二次确认端口释放
    backend_pid=$(pid_by_port $BACKEND_PORT)
    frontend_pid=$(pid_by_port $FRONTEND_PORT)

    if [ -n "$backend_pid" ]; then
        kill -9 "$backend_pid" 2>/dev/null && log_warn "后端强制停止 (PID: $backend_pid)" || true
    fi
    if [ -n "$frontend_pid" ]; then
        kill -9 "$frontend_pid" 2>/dev/null && log_warn "前端强制停止 (PID: $frontend_pid)" || true
    fi
}

# ---- 启动后端 ----
start_backend() {
    log_info "启动后端 (FastAPI) ..."
    cd "$BACKEND_DIR"
    nohup python -m uvicorn app.main:app --host 127.0.0.1 --port $BACKEND_PORT \
        >> "$BACKEND_LOG" 2>&1 &
    local pid=$!
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        log_info "后端启动成功 (PID: $pid, Port: $BACKEND_PORT)"
    else
        log_error "后端启动失败，查看日志: $BACKEND_LOG"
        return 1
    fi
}

# ---- 启动前端 ----
start_frontend() {
    log_info "启动前端 (Next.js) ..."
    cd "$FRONTEND_DIR"
    nohup npm run dev >> "$FRONTEND_LOG" 2>&1 &
    local pid=$!
    sleep 3
    if kill -0 "$pid" 2>/dev/null; then
        log_info "前端启动成功 (PID: $pid, Port: $FRONTEND_PORT)"
    else
        log_error "前端启动失败，查看日志: $FRONTEND_LOG"
        return 1
    fi
}

# ---- 健康检查 ----
health_check() {
    log_info "执行健康检查..."
    local ok=true

    if curl -sf http://127.0.0.1:$BACKEND_PORT/ > /dev/null 2>&1; then
        log_info "后端 API:  ${GREEN}正常${NC}"
    else
        log_error "后端 API:  ${RED}不可达${NC}"
        ok=false
    fi

    if curl -sf -o /dev/null http://127.0.0.1:$FRONTEND_PORT/ 2>&1; then
        log_info "前端页面:  ${GREEN}正常${NC}"
    else
        log_error "前端页面:  ${RED}不可达${NC}"
        ok=false
    fi

    if $ok; then
        log_info "数据库:    ${GREEN}正常${NC} (PostgreSQL → 127.0.0.1:5432/engineering_asset_registry)"
        echo ""
        log_info "========================================="
        log_info "  所有服务启动成功！"
        log_info "  后端 API : http://127.0.0.1:$BACKEND_PORT"
        log_info "  前端页面 : http://127.0.0.1:$FRONTEND_PORT"
        log_info "  API 文档 : http://127.0.0.1:$BACKEND_PORT/docs"
        log_info "========================================="
    else
        echo ""
        log_error "部分服务未就绪，请检查日志: $LOG_DIR"
    fi
}

# ---- 主逻辑 ----
case "${1:-start}" in
    start)
        backend_pid=$(pid_by_port $BACKEND_PORT)
        frontend_pid=$(pid_by_port $FRONTEND_PORT)
        if [ -n "$backend_pid" ] && [ -n "$frontend_pid" ]; then
            log_warn "服务已在运行中（后端 PID: $backend_pid, 前端 PID: $frontend_pid）"
            log_warn "如要重启请执行: $0 restart"
            exit 0
        fi
        # 可能部分运行，先停干净再启动
        [ -n "$backend_pid" ] || [ -n "$frontend_pid" ] && stop_services
        start_backend
        start_frontend
        health_check
        ;;
    restart)
        stop_services
        sleep 1
        start_backend
        start_frontend
        health_check
        ;;
    stop)
        stop_services
        log_info "所有服务已停止"
        ;;
    status)
        backend_pid=$(pid_by_port $BACKEND_PORT)
        frontend_pid=$(pid_by_port $FRONTEND_PORT)
        echo "========================================="
        echo "  Engineering Asset Registry 运行状态"
        echo "========================================="
        if [ -n "$backend_pid" ]; then
            echo -e "  后端 (FastAPI): ${GREEN}运行中${NC}  PID: $backend_pid  Port: $BACKEND_PORT"
        else
            echo -e "  后端 (FastAPI): ${RED}未运行${NC}"
        fi
        if [ -n "$frontend_pid" ]; then
            echo -e "  前端 (Next.js): ${GREEN}运行中${NC}  PID: $frontend_pid  Port: $FRONTEND_PORT"
        else
            echo -e "  前端 (Next.js): ${RED}未运行${NC}"
        fi
        echo "========================================="
        echo "  数据库: PostgreSQL → 127.0.0.1:5432/engineering_asset_registry"
        if PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d engineering_asset_registry -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "  数据库连接: ${GREEN}正常${NC}"
        else
            echo -e "  数据库连接: ${RED}失败${NC}"
        fi
        echo "========================================="
        ;;
    *)
        echo "用法: $0 {start|restart|stop|status}"
        exit 1
        ;;
esac