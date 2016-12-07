import {h, Component} from 'preact'
import {hterm, lib} from 'hterm-umdjs'
import ReconnectingWebSocket from 'reconnecting-websocket'

hterm.defaultStorage = new lib.Storage.Memory()

export default class HTerm extends Component {

  shouldComponentUpdate() {
    return false
  }

  init({onOpen, onError, onClose, podId}, elem) {

    let term = new hterm.Terminal()
    term.decorate(elem)

    term.prefs_.set('audible-bell-sound', '')
    term.prefs_.set('ctrl-c-copy', true)
    term.prefs_.set('use-default-window-copy', true)
    term.prefs_.set('background-color', 'white')
    term.prefs_.set('foreground-color', '#333')
    term.prefs_.set('cursor-color', '#00d1b2')
    term.prefs_.set('scroll-wheel-move-multiplier', 15)

    let ws = new ReconnectingWebSocket(`ws${location.protocol === 'https:' ? 's' : ''}://${location.host}/boxes/${podId}/exec`)
    ws.reconnectInterval = 5000

    function HTerm(argv) {
      this.io = argv.io.push()
    }

    HTerm.prototype.run = function() {
      this.io.onVTKeystroke = this.io.sendString = (str) => {
        ws.send(JSON.stringify({data: str}))
      }
      this.io.onTerminalResize = (width, height) => {
        ws.send(JSON.stringify({width, height}))
      }
    }

    let initSize = (io) => {
      initSize = false
      ws.send(JSON.stringify({
        width: term.io.columnCount,
        height: term.io.rowCount,
      }))
    }

    ws.onmessage = (ev) => {
      term.io.print(ev.data)
      if(initSize) initSize()
    }

    ws.onclose = () => {
      if(onOpen) onClose()
    }

    ws.onerror = (e) => {
      if(onError) onError(e)
    }

    ws.onopen = () => {
      term.reset()
      term.runCommandClass(HTerm)
      if(onOpen) onOpen()
    }
  }

  render(props) {
    requestAnimationFrame(() => {
      let elem = document.createElement('div')
      elem.style.position = 'relative'
      elem.style.width = '100%'
      elem.style.height = '100%'
      this.base.append(elem)

      requestAnimationFrame(() => { this.init(props, elem) })
    })
    return <div style={{height: '100%'}}></div>
  }
}
