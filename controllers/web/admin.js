exports.dashboard = (req, res) => {
  res.render('admin/dashboard', {
    title: req.__('admin.nav.dashboard'),
    activeNav: 'dashboard',
    user: req.user
  });
};
