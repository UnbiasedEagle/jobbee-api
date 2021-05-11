class ApiFilters {
  constructor(query, queryStr) {
    console.log(queryStr);
    this.queryStr = queryStr;
    this.query = query;
  }

  filter = () => {
    let queryStr = { ...this.queryStr };

    const removedFields = ['sort', 'fields', 'q', 'page', 'limit'];

    removedFields.forEach((field) => delete queryStr[field]);

    queryStr = JSON.stringify(queryStr);

    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    queryStr = JSON.parse(queryStr);

    this.query = this.query.find(queryStr);

    return this;
  };

  sort = () => {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');

      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-postingDate');
    }
    return this;
  };

  limitFields = () => {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(',').join(' ');

      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  };

  searchByQuery = () => {
    if (this.queryStr.q) {
      const query = this.queryStr.q.split('-').join(' ');
      this.query = this.query.find({
        title: { $regex: query, $options: 'i' },
      });
    }
    return this;
  };

  paginate = () => {
    const page = parseInt(this.queryStr.page, 10) || 1;
    const limit = parseInt(this.queryStr.limit, 10) || 10;

    const startIndex = (page - 1) * limit;

    this.query = this.query.skip(startIndex).limit(limit);

    return this;
  };
}

export default ApiFilters;
