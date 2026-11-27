const flash = require('../middlewares/flash');

function mockReqRes(cookies = {}) {
  const cleared = [];
  const cookiesSet = [];
  const req = { cookies };
  const res = {
    locals: {},
    clearCookie: (name) => cleared.push(name),
    cookie: (name, value, opts) => cookiesSet.push({ name, value, opts })
  };
  return { req, res, cleared, cookiesSet };
}

describe('middlewares/flash', () => {
  it('sin cookie de flash, no agrega nada a res.locals', () => {
    const { req, res } = mockReqRes();
    flash(req, res, () => {});
    expect(res.locals.flash).toBeUndefined();
  });

  it('con cookie de flash, la expone en res.locals.flash y la borra', () => {
    const { req, res, cleared } = mockReqRes({ flash: JSON.stringify({ message: 'Producto creado', type: 'success' }) });
    flash(req, res, () => {});
    expect(res.locals.flash).toEqual({ message: 'Producto creado', type: 'success' });
    expect(cleared).toContain('flash');
  });

  it('con una cookie de flash corrupta, no truena y no expone nada', () => {
    const { req, res } = mockReqRes({ flash: '{no-es-json' });
    expect(() => flash(req, res, () => {})).not.toThrow();
    expect(res.locals.flash).toBeUndefined();
  });

  it('res.setFlash(mensaje) guarda una cookie de corta duración con ese mensaje', () => {
    const { req, res, cookiesSet } = mockReqRes();
    flash(req, res, () => {});
    res.setFlash('Pedido actualizado', 'success');
    expect(cookiesSet).toHaveLength(1);
    expect(JSON.parse(cookiesSet[0].value)).toEqual({ message: 'Pedido actualizado', type: 'success' });
    expect(cookiesSet[0].opts).toMatchObject({ httpOnly: true });
  });

  it('res.setFlash sin tipo usa "success" por defecto', () => {
    const { req, res, cookiesSet } = mockReqRes();
    flash(req, res, () => {});
    res.setFlash('Listo');
    expect(JSON.parse(cookiesSet[0].value).type).toBe('success');
  });

  it('llama a next()', () => {
    const { req, res } = mockReqRes();
    const next = jest.fn();
    flash(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
