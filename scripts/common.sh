#!/usr/bin/env bash

# Common helpers for Coworker scripts.
# shellcheck disable=SC2034

# ------------------------------
# Color + emoji configuration
# ------------------------------
USE_COLOR=1
if [[ -n "${NO_COLOR:-}" ]] || [[ ! -t 1 ]]; then
  USE_COLOR=0
fi

USE_EMOJI=1
if [[ -n "${NO_EMOJI:-}" ]]; then
  USE_EMOJI=0
fi

# 256-color palette approximations of the Coworker brand tones.
COLOR_RESET="\033[0m"
COLOR_BOLD="\033[1m"
COLOR_CREAM="\033[38;5;230m"
COLOR_CHARCOAL="\033[38;5;238m"
COLOR_TERRACOTTA="\033[38;5;173m"
COLOR_MUTED="\033[38;5;245m"
COLOR_SUCCESS="\033[38;5;114m"
COLOR_WARN="\033[38;5;214m"
COLOR_ERROR="\033[38;5;167m"

EMOJI_SPARKLES="✨"
EMOJI_ROCKET="🚀"
EMOJI_TOOL="🧰"
EMOJI_DB="🗄️"
EMOJI_API="🧩"
EMOJI_APP="🖥️"
EMOJI_CHECK="✅"
EMOJI_WARN="⚠️"
EMOJI_ERROR="⛔"

colorize() {
  local color="$1"
  local text="$2"
  if [[ $USE_COLOR -eq 1 ]]; then
    printf "%b%s%b" "$color" "$text" "$COLOR_RESET"
  else
    printf "%s" "$text"
  fi
}

emoji() {
  local symbol="$1"
  if [[ $USE_EMOJI -eq 1 ]]; then
    printf "%s" "$symbol"
  fi
}

banner() {
  local title="Coworker Dev Boot"
  local subtitle="Where AI feels like a team you already know how to work with."
  printf "%s\n" ""
  printf "+--------------------------------------------------------------+\n"
  printf "| %-60s |\n" "$title"
  printf "| %-60s |\n" "$subtitle"
  printf "+--------------------------------------------------------------+\n"
  printf "%s\n" ""
}

section() {
  local title="$1"
  printf "%s %s\n" "$(emoji "$EMOJI_SPARKLES")" "$(colorize "$COLOR_TERRACOTTA" "$title")"
}

step() {
  local label="$1"
  printf "%s %s\n" "$(emoji "$EMOJI_TOOL")" "$(colorize "$COLOR_CHARCOAL" "$label")"
}

info() {
  local label="$1"
  printf "%s %s\n" "$(emoji "$EMOJI_SPARKLES")" "$(colorize "$COLOR_MUTED" "$label")"
}

success() {
  local label="$1"
  printf "%s %s\n" "$(emoji "$EMOJI_CHECK")" "$(colorize "$COLOR_SUCCESS" "$label")"
}

warn() {
  local label="$1"
  printf "%s %s\n" "$(emoji "$EMOJI_WARN")" "$(colorize "$COLOR_WARN" "$label")"
}

error() {
  local label="$1"
  printf "%s %s\n" "$(emoji "$EMOJI_ERROR")" "$(colorize "$COLOR_ERROR" "$label")"
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    error "Missing dependency: $cmd"
    return 1
  fi
}
