FROM node:lts

ARG TZ
ENV TZ="$TZ"

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  curl \
  ca-certificates \
  wget \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

# Install latest git-delta (resolved from GitHub at build time)
RUN ARCH=$(dpkg --print-architecture) && \
  GIT_DELTA_VERSION=$(curl -fsSL https://api.github.com/repos/dandavison/delta/releases/latest | jq -r '.tag_name') && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Set the default editor and visual
ENV EDITOR=nano
ENV VISUAL=nano

# Install latest zsh-in-docker (resolved from GitHub at build time)
RUN ZSH_IN_DOCKER_TAG=$(curl -fsSL https://api.github.com/repos/deluan/zsh-in-docker/releases/latest | jq -r '.tag_name') && \
  sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/${ZSH_IN_DOCKER_TAG}/zsh-in-docker.sh)" -- \
    -p git \
    -p fzf \
    -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
    -a "source /usr/share/doc/fzf/examples/completion.zsh" \
    -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    -x

# Install latest Claude Code
RUN npm install -g @anthropic-ai/claude-code@latest


# Copy and set up firewall script
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall

# Pre-install Playwright browsers + their OS dependencies at image-build time.
# This is the only clean window: during `docker build` we run as root (so
# `--with-deps` can apt-get the browser system libs that the runtime `node` user
# cannot install without passwordless sudo) AND the runtime firewall
# (init-firewall.sh, applied at postStart) is not active, so the Playwright CDN
# is reachable. Browsers are baked into the image, so tests never hit the network.
# Keep this version in sync with @playwright/test in package.json.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@1.60.0 install --with-deps chromium webkit && \
  chmod -R a+rX /ms-playwright

# Install Claude Code managed policy: default to bypassPermissions mode
RUN mkdir -p /etc/claude-code
COPY managed-settings.json /etc/claude-code/managed-settings.json

USER node
