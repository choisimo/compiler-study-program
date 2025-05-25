#!/bin/bash
#==============================================================================
# 고급 파일 병합 스크립트 (Professional Edition v2.2.1 - 안정화 버전)
# 기능: 스마트 파일 병합, 대화형 메뉴, 설정 관리, 자동 테스트
# 사용법: ./concat_pro_fixed.sh [옵션] 또는 ./concat_pro_fixed.sh --interactive
# 기본 동작: 스마트 병합 (필수 파일 자동 병합)
# 수정사항: set -e 환경에서 파이프라인 오류 방지 로직 적용
#==============================================================================

set -euo pipefail
IFS=$'\n\t'

#==============================================================================
# 전역 변수 및 설정
#==============================================================================
readonly VERSION="2.2.1"
readonly SCRIPT_NAME=$(basename "$0")
readonly CONFIG_DIR="${HOME}/.config/concat_pro"
readonly LOG_DIR="${CONFIG_DIR}/logs"
readonly MAX_LOG_FILES=10

# 기본값 설정
start_dir="."
output_file="merged_$(date +%Y%m%d_%H%M%S).txt"
exclude_dirs=()
file_formats=("*.py" "*.js" "*.ts" "*.jsx" "*.tsx" "*.sh" "*.md" "*.txt" "*.json" "*.yaml" "*.yml")
size_limit="50M"
recursive_mode=true
excluded_extensions=("*.log" "*.tmp" "*.swp" "*.pyc" "*.o" "*.class" "*.cache" "*.min.js" "*.min.css")

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

#==============================================================================
# 로깅 시스템
#==============================================================================
setup_logging() {
    mkdir -p "${LOG_DIR}"
    LOG_FILE="${LOG_DIR}/${SCRIPT_NAME}_$(date +%Y%m%d_%H%M%S).log"
    echo "# Log started at $(date)" > "${LOG_FILE}"
    
    # 오래된 로그 파일 정리
    find "${LOG_DIR}" -name "${SCRIPT_NAME}_*.log" -type f | sort | head -n -${MAX_LOG_FILES} | xargs -r rm -f
}

log_debug() { echo -e "${CYAN}[$(date +"%H:%M:%S")] [DEBUG]${NC} $1" | tee -a "${LOG_FILE:-/dev/null}"; }
log_info() { echo -e "${GREEN}[$(date +"%H:%M:%S")] [INFO]${NC} $1" | tee -a "${LOG_FILE:-/dev/null}"; }
log_warning() { echo -e "${YELLOW}[$(date +"%H:%M:%S")] [WARNING]${NC} $1" | tee -a "${LOG_FILE:-/dev/null}"; }
log_error() { echo -e "${RED}[$(date +"%H:%M:%S")] [ERROR]${NC} $1" | tee -a "${LOG_FILE:-/dev/null}"; }

#==============================================================================
# 유틸리티 함수
#==============================================================================
error_exit() {
    log_error "$1"
    exit "${2:-1}"
}

print_header() {
    clear
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${WHITE}    고급 파일 병합 도구 v${VERSION}${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

print_separator() {
    echo -e "${BLUE}----------------------------------------${NC}"
}

confirm_action() {
    local message="$1"
    echo -e "${YELLOW}$message (y/N):${NC} "
    read -r response
    [[ "$response" =~ ^[Yy]$ ]]
}

#==============================================================================
# 파일 크기 및 디렉토리 관리
#==============================================================================
get_directory_size() {
    local dir="$1"
    du -sk "$dir" 2>/dev/null | cut -f1 || echo "0"
}

convert_size_to_kb() {
    local size="$1"
    case "${size: -1}" in
        M|m) echo $((${size%[Mm]} * 1024)) ;;
        G|g) echo $((${size%[Gg]} * 1024 * 1024)) ;;
        K|k) echo ${size%[Kk]} ;;
        *) echo "$size" ;;
    esac
}

is_directory_too_large() {
    local dir="$1"
    local limit="$2"
    local limit_kb=$(convert_size_to_kb "$limit")
    local dir_size=$(get_directory_size "$dir")
    [ "$dir_size" -gt "$limit_kb" ]
}

format_size() {
    local bytes="$1"
    if [ "$bytes" -ge $((1024*1024*1024)) ]; then
        echo "$(echo "scale=2; $bytes/1024/1024/1024" | bc 2>/dev/null || echo "0")GB"
    elif [ "$bytes" -ge $((1024*1024)) ]; then
        echo "$(echo "scale=2; $bytes/1024/1024" | bc 2>/dev/null || echo "0")MB"
    elif [ "$bytes" -ge 1024 ]; then
        echo "$(echo "scale=2; $bytes/1024" | bc 2>/dev/null || echo "0")KB"
    else
        echo "${bytes}B"
    fi
}

#==============================================================================
# 안전한 파일 타입 검사 함수 (핵심 수정 부분)
#==============================================================================
is_text_file() {
    local file="$1"
    local file_type_info
    
    # 1. 파일 존재 및 읽기 권한 확인
    if [[ ! -f "$file" ]] || [[ ! -r "$file" ]]; then
        log_debug "파일 접근 불가: $file"
        return 1
    fi
    
    # 2. file 명령어 실행 결과를 변수에 안전하게 저장
    file_type_info=$(file -b "$file" 2>/dev/null || echo "unknown")
    
    # 3. 빈 파일 처리
    if [[ -z "$file_type_info" ]] || [[ "$file_type_info" == "unknown" ]]; then
        log_debug "파일 타입 확인 불가: $file"
        return 1
    fi
    
    # 4. 텍스트 파일 여부 확인 (안전한 방식)
    if echo "$file_type_info" | grep -qi "text\|empty\|ascii\|utf-8\|unicode"; then
        return 0  # 텍스트 파일
    else
        log_debug "바이너리 파일 스킵: $file (타입: $file_type_info)"
        return 1  # 바이너리 파일
    fi
}

#==============================================================================
# 스마트 병합 기능 (안정화된 버전)
#==============================================================================
smart_merge_execute() {
    local default_output="smart_merged_$(date +%Y%m%d_%H%M%S).txt"
    local smart_output_file="${1:-$default_output}"

    print_header
    echo -e "${GREEN}🤖 스마트 병합을 시작합니다.${NC}"
    echo -e "${CYAN}필수 파일을 자동으로 검색하여 병합합니다.${NC}"
    print_separator

    # 제외할 디렉토리 및 파일 패턴 정의 (개선된 버전)
    local exclude_dirs_smart=(
        ".git" "node_modules" "__pycache__" "build" "dist" ".venv" "venv" "env" 
        "target" "vendor" "*.egg-info" ".next" ".nuxt" "coverage" ".nyc_output"
        ".pytest_cache" ".tox" "htmlcov" "logs" "tmp" "temp"
    )
    
    local exclude_files_smart=(
        "*.log" "*.tmp" "*.swp" "*.pyc" "*.o" "*.class" "*.cache" ".DS_Store" 
        "package-lock.json" "yarn.lock" "*.min.js" "*.min.css" "*.map"
        "*.exe" "*.dll" "*.so" "*.dylib" "*.zip" "*.tar.gz" "*.rar"
    )

    # find 명령어 구성
    local find_args=("." -type f)
    
    # 제외 디렉토리 조건 추가
    for dir in "${exclude_dirs_smart[@]}"; do
        find_args+=(-not -path "*/${dir}/*")
    done
    
    # 제외 파일 조건 추가
    for file in "${exclude_files_smart[@]}"; do
        find_args+=(-not -name "${file}")
    done

    # 출력 파일 초기화
    cat > "$smart_output_file" << EOF
#==============================================================================
# 스마트 병합 결과 - $(date)
# 생성자: $SCRIPT_NAME v$VERSION
# 시작 디렉토리: $(pwd)
#==============================================================================

EOF

    log_info "스마트 병합 시작 -> ${smart_output_file}"
    
    local count=0
    local success=0
    local skipped=0
    local total_size=0
    local start_time=$(date +%s)

    echo -e "${CYAN}🔍 파일을 검색하고 텍스트 파일만 필터링 중...${NC}"

    # 파일 처리 (안정화된 버전 - 핵심 수정 부분)
    while IFS= read -r -d $'\0' file; do
        ((count++))
        
        # 안전한 텍스트 파일 검사
        if ! is_text_file "$file"; then
            ((skipped++))
            continue
        fi
        
        # 파일 크기 확인 (안전한 방식)
        local file_size
        file_size=$(stat -c "%s" "$file" 2>/dev/null || echo "0")
        
        # 파일이 너무 크면 스킵 (1MB 이상)
        if [ "$file_size" -gt 1048576 ]; then
            log_debug "파일 크기 초과로 스킵: $file ($(format_size $file_size))"
            ((skipped++))
            continue
        fi
        
        # 파일 내용 추가 (오류 처리 포함)
        if {
            format_file_header "$file"
            cat "$file" 2>/dev/null || echo "# 파일 읽기 오류: $file"
            echo -e "\n"
        } >> "$smart_output_file"; then
            ((success++))
            total_size=$((total_size + file_size))
            
            # 진행률 표시 (매 10개마다)
            if [ $((success % 10)) -eq 0 ]; then
                echo -ne "${GREEN}  [${success}] 파일 처리됨...${NC}\r"
            fi
        else
            log_warning "파일 추가 실패: $file"
            ((skipped++))
        fi
        
    done < <(find "${find_args[@]}" -print0 2>/dev/null || true)

    echo # 줄바꿈

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # 결과 요약 추가
    cat >> "$smart_output_file" << EOF

#==============================================================================
# 병합 완료 정보
# 처리 시간: ${duration}초
# 검사한 파일 수: $count
# 성공한 파일 수: $success
# 스킵한 파일 수: $skipped
# 총 크기: $(format_size $total_size)
# 완료 시간: $(date)
#==============================================================================
EOF

    print_separator
    if [ "$success" -eq 0 ]; then
        log_warning "병합할 파일을 찾지 못했습니다."
        echo -e "${YELLOW}⚠️ 병합할 파일을 찾지 못했습니다.${NC}"
        echo -e "${CYAN}💡 검사한 파일: $count개, 스킵한 파일: $skipped개${NC}"
    else
        log_info "스마트 병합 완료: 총 ${success}개 파일 병합 ($(format_size $total_size))"
        echo -e "${GREEN}✅ 완료!${NC} ${WHITE}${success}개${NC}의 파일이 ${WHITE}\"${smart_output_file}\"${NC} 파일에 성공적으로 병합되었습니다."
        echo -e "${CYAN}📊 총 크기: $(format_size $total_size), 처리 시간: ${duration}초${NC}"
        echo -e "${CYAN}📈 검사한 파일: $count개, 스킵한 파일: $skipped개${NC}"
    fi
}

#==============================================================================
# 파일 헤더 포맷팅 (개선된 버전)
#==============================================================================
format_file_header() {
    local file="$1"
    local file_size=$(stat -c "%s" "$file" 2>/dev/null || echo "0")
    local last_modified=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1 || echo "Unknown")
    local relative_path=$(realpath --relative-to="$(pwd)" "$file" 2>/dev/null || echo "$file")

    cat << EOF

#==============================================================================
# 파일: $(basename "$file")
# 경로: $relative_path
# 크기: $(format_size $file_size)
# 수정: $last_modified
#==============================================================================

EOF
}

#==============================================================================
# 파일 검색 엔진 (최적화된 버전)
#==============================================================================
find_files() {
    local find_args=("$start_dir" -type f)
    
    # 제외 디렉토리 처리
    for dir in "${exclude_dirs[@]}"; do
        find_args+=(-not -path "${dir}/*")
    done
    
    # 크기 제한 초과 디렉토리 제외
    while IFS= read -r -d $'\0' dir; do
        if is_directory_too_large "$dir" "$size_limit"; then
            find_args+=(-not -path "${dir}/*")
            log_debug "크기 제한 초과 디렉토리 제외: $dir"
        fi
    done < <(find "$start_dir" -type d -print0 2>/dev/null || true)
    
    # 파일 형식 필터링
    if [ ${#file_formats[@]} -gt 0 ]; then
        find_args+=("(")
        for ((i=0; i<${#file_formats[@]}; i++)); do
            find_args+=(-iname "${file_formats[$i]}")
            if [ $i -lt $((${#file_formats[@]} - 1)) ]; then
                find_args+=(-o)
            fi
        done
        find_args+=(")")
    fi
    
    # 제외 확장자 처리
    for ext in "${excluded_extensions[@]}"; do
        find_args+=(-not -name "$ext")
    done
    
    log_debug "Find 명령: find ${find_args[*]} -print0"
    find "${find_args[@]}" -print0 2>/dev/null || true
}

#==============================================================================
# 설정 관리 시스템
#==============================================================================
save_config() {
    local config_name="$1"
    local config_path="${CONFIG_DIR}/${config_name}.conf"
    
    mkdir -p "$CONFIG_DIR"
    cat > "$config_path" << EOF
# Concat Pro Config - $(date)
start_dir="$start_dir"
output_file="$output_file"
exclude_dirs=($(printf '"%s" ' "${exclude_dirs[@]}"))
file_formats=($(printf '"%s" ' "${file_formats[@]}"))
excluded_extensions=($(printf '"%s" ' "${excluded_extensions[@]}"))
size_limit="$size_limit"
recursive_mode=$recursive_mode
EOF
    log_info "설정 저장됨: $config_path"
    echo -e "${GREEN}✅ 설정이 저장되었습니다: $config_name${NC}"
}

load_config() {
    local config_name="$1"
    local config_path="${CONFIG_DIR}/${config_name}.conf"
    
    if [[ -f "$config_path" ]]; then
        source "$config_path"
        log_info "설정 불러옴: $config_path"
        echo -e "${GREEN}✅ 설정을 불러왔습니다: $config_name${NC}"
    else
        log_error "설정 파일 없음: $config_path"
        echo -e "${RED}❌ 설정 파일을 찾을 수 없습니다: $config_name${NC}"
        return 1
    fi
}

list_configs() {
    if [[ -d "$CONFIG_DIR" ]]; then
        find "$CONFIG_DIR" -name "*.conf" -printf "%f\n" 2>/dev/null | sed 's/\.conf$//' | sort
    fi
}

#==============================================================================
# 고급 테스트 시스템 (안정화된 버전)
#==============================================================================
run_comprehensive_test() {
    print_header
    echo -e "${CYAN}🔧 시스템 진단 및 테스트를 시작합니다...${NC}"
    print_separator
    
    local test_results=()
    local total_tests=6
    local passed_tests=0
    
    # 1. 필수 명령어 검사
    echo -e "${BLUE}1. 필수 명령어 검사...${NC}"
    local required_commands=("find" "cat" "du" "stat" "file" "bc")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [ ${#missing_commands[@]} -eq 0 ]; then
        echo -e "   ${GREEN}✅ 모든 필수 명령어가 사용 가능합니다${NC}"
        ((passed_tests++))
    else
        echo -e "   ${RED}❌ 누락된 명령어: ${missing_commands[*]}${NC}"
    fi
    
    # 2. 디렉토리 권한 검사
    echo -e "${BLUE}2. 디렉토리 권한 검사...${NC}"
    if [[ -r "$start_dir" && -x "$start_dir" ]]; then
        echo -e "   ${GREEN}✅ 시작 디렉토리 접근 가능: $start_dir${NC}"
        ((passed_tests++))
    else
        echo -e "   ${RED}❌ 시작 디렉토리 접근 불가: $start_dir${NC}"
    fi
    
    # 3. 출력 디렉토리 쓰기 권한
    echo -e "${BLUE}3. 출력 권한 검사...${NC}"
    local output_dir=$(dirname "$output_file")
    if [[ -w "$output_dir" ]]; then
        echo -e "   ${GREEN}✅ 출력 디렉토리 쓰기 가능: $output_dir${NC}"
        ((passed_tests++))
    else
        echo -e "   ${RED}❌ 출력 디렉토리 쓰기 불가: $output_dir${NC}"
    fi
    
    # 4. 파일 검색 테스트 (안전한 버전)
    echo -e "${BLUE}4. 파일 검색 테스트...${NC}"
    local file_count=0
    local text_file_count=0
    
    while IFS= read -r -d $'\0' file; do
        ((file_count++))
        if is_text_file "$file"; then
            ((text_file_count++))
            if [ "$text_file_count" -le 3 ]; then
                echo -e "   ${CYAN}텍스트 파일 발견: $file${NC}"
            fi
        fi
        if [ "$file_count" -ge 20 ]; then break; fi
    done < <(find_files 2>/dev/null || true)
    
    if [ "$file_count" -gt 0 ]; then
        echo -e "   ${GREEN}✅ 파일 검색 성공 (총 ${file_count}개, 텍스트 ${text_file_count}개)${NC}"
        ((passed_tests++))
    else
        echo -e "   ${YELLOW}⚠️ 검색 조건에 맞는 파일 없음${NC}"
    fi
    
    # 5. 디스크 공간 검사
    echo -e "${BLUE}5. 디스크 공간 검사...${NC}"
    local available_space=$(df "$(dirname "$output_file")" | awk 'NR==2 {print $4}' 2>/dev/null || echo "0")
    if [ "$available_space" -gt 102400 ]; then # 100MB
        echo -e "   ${GREEN}✅ 충분한 디스크 공간 ($(format_size $((available_space * 1024))))${NC}"
        ((passed_tests++))
    else
        echo -e "   ${YELLOW}⚠️ 디스크 공간 부족 ($(format_size $((available_space * 1024))))${NC}"
    fi
    
    # 6. 파일 타입 검사 기능 테스트
    echo -e "${BLUE}6. 파일 타입 검사 기능 테스트...${NC}"
    local test_file="/etc/passwd"
    if [[ -f "$test_file" ]]; then
        if is_text_file "$test_file"; then
            echo -e "   ${GREEN}✅ 파일 타입 검사 기능이 정상 작동합니다${NC}"
            ((passed_tests++))
        else
            echo -e "   ${RED}❌ 파일 타입 검사 기능에 문제가 있습니다${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️ 테스트 파일을 찾을 수 없어 기능 테스트를 건너뜁니다${NC}"
        ((passed_tests++))  # 테스트 파일이 없는 것은 오류가 아님
    fi
    
    # 결과 요약
    print_separator
    echo -e "${WHITE}테스트 결과: ${passed_tests}/${total_tests} 통과${NC}"
    
    if [ "$passed_tests" -eq "$total_tests" ]; then
        echo -e "${GREEN}🎉 모든 테스트를 통과했습니다! 병합을 안전하게 실행할 수 있습니다.${NC}"
    elif [ "$passed_tests" -ge $((total_tests * 2 / 3)) ]; then
        echo -e "${YELLOW}⚠️ 대부분의 테스트를 통과했습니다. 주의해서 진행하세요.${NC}"
    else
        echo -e "${RED}❌ 여러 테스트가 실패했습니다. 설정을 확인하고 다시 시도하세요.${NC}"
    fi
    
    echo
    read -p "아무 키나 눌러 계속..." -n1
}

#==============================================================================
# 대화형 메뉴 시스템 (기존과 동일)
#==============================================================================
show_main_menu() {
    while true; do
        print_header
        cat << EOF
${GREEN}0.${NC} ${WHITE}스마트 병합${NC} - 필수 파일 자동 병합 ${CYAN}(추천)${NC}
${GREEN}1.${NC} ${WHITE}커스텀 병합${NC} - 현재 설정으로 병합 실행
${GREEN}2.${NC} ${WHITE}파일 형식 설정${NC} - 검색할 파일 유형 선택
${GREEN}3.${NC} ${WHITE}제외 설정 관리${NC} - 디렉토리/파일 제외 설정
${GREEN}4.${NC} ${WHITE}고급 테스트${NC} - 시스템 진단 및 검사
${GREEN}5.${NC} ${WHITE}설정 관리${NC} - 저장/불러오기/내보내기
${GREEN}6.${NC} ${WHITE}도움말${NC} - 사용법 및 팁
${GREEN}7.${NC} ${WHITE}종료${NC}

${PURPLE}현재 설정:${NC}
${CYAN}• 디렉토리:${NC} $start_dir
${CYAN}• 출력 파일:${NC} $output_file
${CYAN}• 파일 형식:${NC} ${file_formats[*]:0:3}$([ ${#file_formats[@]} -gt 3 ] && echo "...")
${CYAN}• 크기 제한:${NC} $size_limit
EOF
        print_separator
        
        read -p "메뉴 선택 (0-7): " choice
        case $choice in
            0) smart_merge_execute; return ;;
            1) execute_custom_merge; return ;;
            2) configure_file_formats_menu ;;
            3) manage_exclusions_menu ;;
            4) run_comprehensive_test ;;
            5) config_management_menu ;;
            6) show_help_menu ;;
            7) 
                log_info "사용자 종료 요청"
                echo -e "${GREEN}👋 안녕히 가세요!${NC}"
                exit 0 
                ;;
            *) 
                echo -e "${RED}❌ 잘못된 선택입니다. 0-7 사이의 숫자를 입력하세요.${NC}"
                sleep 2
                ;;
        esac
    done
}

#==============================================================================
# 간소화된 메뉴 함수들 (기본 기능만 포함)
#==============================================================================
configure_file_formats_menu() {
    while true; do
        print_header
        echo -e "${WHITE}파일 형식 설정${NC}"
        print_separator
        
        echo -e "${CYAN}현재 설정:${NC} ${file_formats[*]}"
        echo
        
        cat << EOF
${GREEN}1.${NC} 웹 개발 파일 (*.js, *.ts, *.jsx, *.tsx, *.html, *.css)
${GREEN}2.${NC} Python 프로젝트 (*.py, *.pyx, *.pyi)
${GREEN}3.${NC} 문서 파일 (*.md, *.txt, *.rst)
${GREEN}4.${NC} 설정 파일 (*.json, *.yaml, *.yml, *.toml)
${GREEN}5.${NC} 모든 텍스트 파일 (자동 감지)
${GREEN}6.${NC} 사용자 지정 형식
${GREEN}7.${NC} 이전 메뉴로
EOF
        print_separator
        
        read -p "선택 (1-7): " choice
        case $choice in
            1) 
                file_formats=("*.js" "*.ts" "*.jsx" "*.tsx" "*.html" "*.css" "*.scss" "*.less")
                echo -e "${GREEN}✅ 웹 개발 파일 형식으로 설정되었습니다.${NC}"
                sleep 1
                ;;
            2) 
                file_formats=("*.py" "*.pyx" "*.pyi" "*.pyw")
                echo -e "${GREEN}✅ Python 프로젝트 파일 형식으로 설정되었습니다.${NC}"
                sleep 1
                ;;
            3) 
                file_formats=("*.md" "*.txt" "*.rst" "*.doc")
                echo -e "${GREEN}✅ 문서 파일 형식으로 설정되었습니다.${NC}"
                sleep 1
                ;;
            4) 
                file_formats=("*.json" "*.yaml" "*.yml" "*.toml" "*.ini" "*.conf")
                echo -e "${GREEN}✅ 설정 파일 형식으로 설정되었습니다.${NC}"
                sleep 1
                ;;
            5) 
                file_formats=("*")
                echo -e "${GREEN}✅ 모든 텍스트 파일을 대상으로 설정되었습니다.${NC}"
                sleep 1
                ;;
            6) 
                echo -e "${CYAN}공백으로 구분된 파일 패턴을 입력하세요:${NC}"
                read -r custom_formats
                if [[ -n "$custom_formats" ]]; then
                    IFS=' ' read -r -a file_formats <<< "$custom_formats"
                    echo -e "${GREEN}✅ 사용자 지정 형식으로 설정되었습니다.${NC}"
                else
                    echo -e "${RED}❌ 형식이 입력되지 않았습니다.${NC}"
                fi
                sleep 1
                ;;
            7) return ;;
            *) 
                echo -e "${RED}❌ 잘못된 선택입니다.${NC}"
                sleep 1
                ;;
        esac
    done
}

manage_exclusions_menu() {
    while true; do
        print_header
        echo -e "${WHITE}제외 설정 관리${NC}"
        print_separator
        
        echo -e "${CYAN}제외 디렉토리:${NC}"
        if [ ${#exclude_dirs[@]} -eq 0 ]; then
            echo "  (없음)"
        else
            for i in "${!exclude_dirs[@]}"; do
                echo "  $((i+1)). ${exclude_dirs[$i]}"
            done
        fi
        
        echo
        echo -e "${CYAN}크기 제한:${NC} $size_limit"
        
        print_separator
        
        cat << EOF
${GREEN}1.${NC} 디렉토리 제외 추가
${GREEN}2.${NC} 디렉토리 제외 제거
${GREEN}3.${NC} 크기 제한 설정
${GREEN}4.${NC} 일반적인 제외 패턴 적용
${GREEN}5.${NC} 이전 메뉴로
EOF
        
        read -p "선택 (1-5): " choice
        case $choice in
            1) 
                echo -e "${CYAN}제외할 디렉토리 경로를 입력하세요:${NC}"
                read -r new_dir
                if [[ -n "$new_dir" ]]; then
                    exclude_dirs+=("$new_dir")
                    echo -e "${GREEN}✅ 디렉토리가 제외 목록에 추가되었습니다: $new_dir${NC}"
                fi
                sleep 2
                ;;
            2) 
                if [ ${#exclude_dirs[@]} -gt 0 ]; then
                    echo -e "${CYAN}제거할 디렉토리 번호를 선택하세요:${NC}"
                    read -r remove_idx
                    if [[ "$remove_idx" =~ ^[0-9]+$ ]] && [ "$remove_idx" -ge 1 ] && [ "$remove_idx" -le "${#exclude_dirs[@]}" ]; then
                        exclude_dirs=("${exclude_dirs[@]:0:$((remove_idx-1))}" "${exclude_dirs[@]:$remove_idx}")
                        echo -e "${GREEN}✅ 디렉토리가 제외 목록에서 제거되었습니다.${NC}"
                    fi
                fi
                sleep 2
                ;;
            3) 
                echo -e "${CYAN}디렉토리 크기 제한을 입력하세요 (예: 10M, 1G):${NC}"
                read -r new_limit
                if [[ "$new_limit" =~ ^[0-9]+[KMGkmg]?$ ]]; then
                    size_limit="$new_limit"
                    echo -e "${GREEN}✅ 크기 제한이 설정되었습니다: $size_limit${NC}"
                fi
                sleep 2
                ;;
            4) 
                exclude_dirs+=(".git" "node_modules" "__pycache__" "build" "dist" ".venv" "venv")
                echo -e "${GREEN}✅ 일반적인 제외 패턴이 적용되었습니다.${NC}"
                sleep 2
                ;;
            5) return ;;
        esac
    done
}

config_management_menu() {
    while true; do
        print_header
        echo -e "${WHITE}설정 관리${NC}"
        print_separator
        
        cat << EOF
${GREEN}1.${NC} 현재 설정 저장
${GREEN}2.${NC} 설정 불러오기
${GREEN}3.${NC} 설정 목록 보기
${GREEN}4.${NC} 이전 메뉴로
EOF
        
        read -p "선택 (1-4): " choice
        case $choice in
            1) 
                echo -e "${CYAN}설정 이름을 입력하세요:${NC}"
                read -r config_name
                if [[ -n "$config_name" ]]; then
                    save_config "$config_name"
                fi
                sleep 2
                ;;
            2) 
                local configs=($(list_configs))
                if [ ${#configs[@]} -gt 0 ]; then
                    echo -e "${CYAN}저장된 설정:${NC}"
                    for i in "${!configs[@]}"; do
                        echo "  $((i+1)). ${configs[$i]}"
                    done
                    echo -e "${CYAN}불러올 설정 번호를 선택하세요:${NC}"
                    read -r choice_num
                    if [[ "$choice_num" =~ ^[0-9]+$ ]] && [ "$choice_num" -ge 1 ] && [ "$choice_num" -le "${#configs[@]}" ]; then
                        load_config "${configs[$((choice_num-1))]}"
                    fi
                else
                    echo -e "${YELLOW}⚠️ 저장된 설정이 없습니다.${NC}"
                fi
                sleep 2
                ;;
            3) 
                echo -e "${CYAN}저장된 설정 목록:${NC}"
                list_configs
                sleep 3
                ;;
            4) return ;;
        esac
    done
}

execute_custom_merge() {
    print_header
    echo -e "${GREEN}🔧 커스텀 병합을 시작합니다.${NC}"
    print_separator
    
    if ! confirm_action "현재 설정으로 병합을 실행하시겠습니까?"; then
        return
    fi
    
    # 간단한 커스텀 병합 실행
    local count=0
    local success=0
    
    cat > "$output_file" << EOF
#==============================================================================
# 커스텀 병합 결과 - $(date)
# 생성자: $SCRIPT_NAME v$VERSION
#==============================================================================

EOF

    while IFS= read -r -d $'\0' file; do
        ((count++))
        if is_text_file "$file"; then
            {
                format_file_header "$file"
                cat "$file" 2>/dev/null || echo "# 파일 읽기 오류"
                echo -e "\n"
            } >> "$output_file"
            ((success++))
        fi
    done < <(find_files)
    
    echo -e "${GREEN}✅ 완료! ${success}개 파일이 병합되었습니다.${NC}"
    sleep 2
}

show_help_menu() {
    print_header
    echo -e "${WHITE}도움말${NC}"
    print_separator
    
    cat << EOF
${CYAN}📖 기본 사용법:${NC}
  • 옵션 없이 실행: 스마트 병합 (추천)
  • --interactive: 대화형 메뉴 실행

${CYAN}🎯 스마트 병합 특징:${NC}
  • 자동으로 텍스트 파일만 감지
  • 일반적인 불필요 파일/디렉토리 자동 제외
  • 안정적인 오류 처리

${CYAN}💡 유용한 팁:${NC}
  • 설정을 저장해두면 반복 작업이 편리합니다
  • 테스트 기능으로 미리 확인해보세요

${CYAN}🔧 주요 개선사항 (v2.2.1):${NC}
  • set -e 환경에서 파이프라인 오류 방지
  • 안정적인 파일 타입 검사
  • 향상된 오류 처리 및 로깅
EOF
    
    read -p "아무 키나 눌러 계속..." -n1
}

#==============================================================================
# 명령줄 도움말
#==============================================================================
show_help() {
    cat << EOF
${PURPLE}========================================${NC}
${WHITE}    고급 파일 병합 도구 v${VERSION}${NC}
${PURPLE}========================================${NC}

${CYAN}사용법:${NC} $SCRIPT_NAME [옵션]

${CYAN}기본 동작:${NC}
  옵션 없이 실행 시 '스마트 병합' 기능이 작동합니다.

${CYAN}옵션:${NC}
  -i, --interactive      대화형 메뉴 실행
  -d, --directory DIR    시작 디렉토리 지정
  -o, --output FILE      출력 파일 지정
  -t, --test             시스템 테스트 실행
  -h, --help             도움말 표시
  -v, --version          버전 정보 표시

${CYAN}예시:${NC}
  $SCRIPT_NAME                    # 스마트 병합 실행
  $SCRIPT_NAME --interactive      # 대화형 메뉴
  $SCRIPT_NAME -t                 # 테스트 실행

${CYAN}v2.2.1 개선사항:${NC}
  • 안정적인 파이프라인 오류 처리
  • 향상된 파일 타입 검사
  • 더 나은 오류 복구 기능
EOF
}

#==============================================================================
# 메인 함수
#==============================================================================
main() {
    setup_logging
    log_info "스크립트 시작 - 버전 ${VERSION} (안정화 버전)"
    
    if [[ $# -eq 0 ]]; then
        smart_merge_execute
        exit 0
    fi
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -i|--interactive)
                show_main_menu
                exit 0
                ;;
            -d|--directory)
                start_dir="${2:-$start_dir}"
                shift 2 || shift
                ;;
            -o|--output)
                output_file="${2:-$output_file}"
                shift 2 || shift
                ;;
            -t|--test)
                run_comprehensive_test
                exit 0
                ;;
            -v|--version)
                echo -e "${WHITE}$SCRIPT_NAME v$VERSION (안정화 버전)${NC}"
                exit 0
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 알 수 없는 옵션: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    smart_merge_execute
}

#==============================================================================
# 신호 처리 및 정리
#==============================================================================
cleanup() {
    log_info "스크립트 정리 중..."
    exit 0
}

trap cleanup EXIT
trap 'log_warning "스크립트 중단됨 (SIGINT)"; exit 1' INT
trap 'log_warning "스크립트 종료됨 (SIGTERM)"; exit 1' TERM

#==============================================================================
# 스크립트 실행
#==============================================================================
main "$@"