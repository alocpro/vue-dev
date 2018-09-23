'use strict'

/**
 * Module dependencies.
 */

const instantiateOption = require('./override/instantiateOption')
const { flattenPlugin, normalizePluginsConfig } = require('./util')
const { PLUGIN_OPTION_MAP } = require('./constants')
const {
  shortcutPackageResolver: { resolvePlugin },
  datatypes: { assertTypes },
  env: { isDebug },
  logger, chalk
} = require('@vuepress/shared-utils')

/**
 * Expose PluginAPI class.
 */

module.exports = class PluginAPI {
  constructor (context) {
    this.options = {}
    this._pluginContext = context
    this._pluginQueue = []
    this._initializeOptions(PLUGIN_OPTION_MAP)
  }

  /**
   * Get enabled plugins
   * @returns {array}
   */

  get enabledPlugins () {
    return this._pluginQueue.filter(({ enabled }) => enabled)
  }

  /**
   * Get disabled plugins
   * @returns {array}
   */

  get disabledPlugins () {
    return this._pluginQueue.filter(({ enabled }) => !enabled)
  }

  /**
   * apply plugin.
   */

  apply () {
    this._pluginQueue.forEach(plugin => {
      if (plugin.enabled) {
        this.applyPlugin(plugin)
      } else {
        logger.debug(`\n${chalk.gray(`[${plugin.name}]`)} disabled.`)
      }
    })
  }

  /**
   * Normalize plugin and push it to the plugin queue.
   * @param {object} pluginRaw
   * @param {object} pluginOptions
   * @returns {module.PluginAPI}
   */

  use (pluginRaw, pluginOptions = {}) {
    let plugin = resolvePlugin(pluginRaw)
    if (!plugin.module) {
      console.warn(`[vuepress] cannot resolve plugin "${pluginRaw}"`)
      return this
    }
    plugin = flattenPlugin(plugin, pluginOptions, this._pluginContext, this)
    if (plugin.multiple !== true) {
      const duplicateIndex = this._pluginQueue.findIndex(({ name }) => name === plugin.name)
      if (duplicateIndex !== -1) {
        this._pluginQueue.splice(duplicateIndex, 1)
      }
    }
    this._pluginQueue.push(plugin)
    return this
  }

  /**
   * Use plugin by config.
   * @param pluginsConfig
   * @returns {module.PluginAPI}
   */

  useByPluginsConfig (pluginsConfig) {
    pluginsConfig = normalizePluginsConfig(pluginsConfig)
    pluginsConfig.forEach(([pluginRaw, pluginOptions]) => {
      this.use(pluginRaw, pluginOptions)
    })
    return this
  }

  /**
   * initialize plugin options.
   */

  _initializeOptions () {
    Object.keys(PLUGIN_OPTION_MAP).forEach(key => {
      const option = PLUGIN_OPTION_MAP[key]
      this.options[option.name] = instantiateOption(option.name)
    })
  }

  /**
   * Register plugin option.
   * @param {string} key
   * @param {any} value
   * @param {string} pluginName
   * @returns {module.PluginAPI}
   */

  registerOption (key, value, pluginName) {
    const option = PLUGIN_OPTION_MAP[key]
    const types = option.types
    const { valid, warnMsg } = assertTypes(value, types)
    if (valid) {
      this.options[option.name].add(pluginName, value)
    } else if (value !== undefined) {
      logger.warn(
        `${chalk.gray(pluginName)} ` +
        `Invalid value for "option" ${chalk.cyan(option.name)}: ${warnMsg}`
      )
    }
    return this
  }

  /**
   * apply plugin.
   */

  applyPlugin ({
    // info
    name: pluginName,
    shortcut,

    // hooks
    ready,
    compiled,
    updated,
    generated,

    // options
    chainWebpack,
    enhanceDevServer,
    extendMarkdown,
    enhanceAppFiles,
    outFiles,
    extendPageData,
    clientDynamicModules,
    clientRootMixin,
    additionalPages,
    globalUIComponents,
    define,
    alias
  }) {
    const isInternalPlugin = pluginName.startsWith('@vuepress/internal-')
    if (shortcut) {
      logger.tip(`\nApply plugin ${chalk.magenta(shortcut)} ${chalk.gray(`(i.e. "${pluginName}")`)} ...`, !isInternalPlugin)
    } else if (!isInternalPlugin || isDebug) {
      logger.tip(`\nApply plugin ${chalk.magenta(pluginName)} ...`)
    }

    this
      .registerOption(PLUGIN_OPTION_MAP.READY.key, ready, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.COMPILED.key, compiled, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.UPDATED.key, updated, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.GENERATED.key, generated, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.CHAIN_WEBPACK.key, chainWebpack, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.ENHANCE_DEV_SERVER.key, enhanceDevServer, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.EXTEND_MARKDOWN.key, extendMarkdown, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.EXTEND_PAGE_DATA.key, extendPageData, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.ENHANCE_APP_FILES.key, enhanceAppFiles, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.OUT_FILES.key, outFiles, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.CLIENT_DYNAMIC_MODULES.key, clientDynamicModules, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.CLIENT_ROOT_MIXIN.key, clientRootMixin, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.ADDITIONAL_PAGES.key, additionalPages, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.GLOBAL_UI_COMPONENTS.key, globalUIComponents, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.DEFINE.key, define, pluginName)
      .registerOption(PLUGIN_OPTION_MAP.ALIAS.key, alias, pluginName)
  }
}
