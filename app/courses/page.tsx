import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { addToCartAction } from "@/lib/actions/cart";
import { formatPrice } from "@/lib/format";
import { getBundleProduct } from "@/lib/services/commerce";
import { listCourses } from "@/lib/store";
import { getCurrentStudent } from "@/lib/studentAuth";

export const metadata = {
  title: "Courses | Dr Cyber"
};

export default async function CoursesPage() {
  const [student, courses, bundle] = await Promise.all([getCurrentStudent(), listCourses(), getBundleProduct()]);

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint">Online course library</p>
          <h1 className="mt-3 text-4xl font-bold">Learn cybersecurity, one pathway at a time</h1>
          <p className="mt-4 max-w-2xl text-slate-200">
            Every pathway from the career quiz is available as a self-paced course with lessons, portfolio projects,
            and progress tracking.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        {bundle ? (
          <form action={addToCartAction} className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-cyan bg-white p-5">
            <div>
              <p className="font-bold">All {bundle.bundleItems.length} courses - {formatPrice(bundle.priceCents, bundle.currency)}</p>
              <p className="text-sm text-slate-600">Best value: the whole beginner library in one purchase.</p>
            </div>
            <input type="hidden" name="productSlug" value={bundle.slug} />
            <button className="rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy hover:bg-mint" type="submit">
              Add the bundle to cart
            </button>
          </form>
        ) : null}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </main>
  );
}
